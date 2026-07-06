import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL');

// Create tables based on the ER diagram
db.exec(`
  CREATE TABLE IF NOT EXISTS Request (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Theme TEXT,
    Date TEXT,
    Filters TEXT
  );
  
  CREATE TABLE IF NOT EXISTS SourceArticle (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Request_ID INTEGER,
    Title TEXT,
    URL TEXT,
    Source TEXT,
    Content TEXT,
    Published TEXT,
    FOREIGN KEY(Request_ID) REFERENCES Request(ID)
  );

  CREATE TABLE IF NOT EXISTS AnalysisResult (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Request_ID INTEGER,
    Conclusion TEXT,
    Summary TEXT,
    Differences TEXT,
    FOREIGN KEY(Request_ID) REFERENCES Request(ID)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/analyze', async (req, res) => {
    try {
      const { topic, domains } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const sourceList = domains.join(", ");
      
      // Stage 1: Get URLs via Gemini Search
      const searchPrompt = `
        Search Google for the latest news articles about "${topic}".
        If possible, look for articles from these sources: ${sourceList || 'any credible news site'}.
        Please use the Google Search tool to find real-time results and return a brief overview of the events.
      `;
      
      const searchResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: searchPrompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      let parsedUrls: { title: string, url: string }[] = [];
      const uniqueUrls = new Set<string>();
      
      const isValidArticleUrl = (urlStr: string) => {
        try {
          const u = new URL(urlStr);
          if (u.pathname === '/' || u.pathname === '') return false;
          const pathSegments = u.pathname.split('/').filter(Boolean);
          if (pathSegments.length === 0) return false;
          const firstSegment = pathSegments[0].toLowerCase();
          if (firstSegment === 'archive' || firstSegment === 'arhivs') return false;
          const categories = ['zinas', 'bizness', 'sports', 'izklaide', 'laika-zinas', 'tv', 'skaties', 'video', 'podkasti'];
          if (pathSegments.length === 1 && categories.includes(firstSegment)) return false;
          return true;
        } catch {
          return false;
        }
      };

      // Load from Gemini
      for (const chunk of chunks) {
        if (chunk.web?.uri && !uniqueUrls.has(chunk.web.uri) && isValidArticleUrl(chunk.web.uri)) {
          uniqueUrls.add(chunk.web.uri);
          parsedUrls.push({ title: chunk.web.title || "Source", url: chunk.web.uri });
        }
      }

      // Augment with Yahoo Search (highly reliable for exact keywords)
      try {
        let searchStr = topic;
        if (domains && domains.length > 0) {
           searchStr += ' ' + domains.map((d: string) => `site:${d}`).join(' OR ');
        }
        const searchUrl = 'https://search.yahoo.com/search?p=' + encodeURIComponent(searchStr);
        const searchRes = await fetch(searchUrl, {
           headers: {
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
           }
        });
        if (searchRes.ok) {
          const html = await searchRes.text();
          const matches = [...html.matchAll(/\/RU=(https[^/]+)\//g)];
          for (const match of matches) {
            try {
              let decodedUrl = decodeURIComponent(match[1]);
              // Remove query params added by Yahoo if any, or just use as is
              if (!uniqueUrls.has(decodedUrl) && !decodedUrl.includes('google.com') && !decodedUrl.includes('draugiem.lv') && !decodedUrl.includes('yahoo.com') && isValidArticleUrl(decodedUrl)) {
                uniqueUrls.add(decodedUrl);
                parsedUrls.push({ title: new URL(decodedUrl).hostname, url: decodedUrl });
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }
      } catch (err) {
        console.error("Yahoo Search fetch failed:", err);
      }

      // Prioritize requested domains
      if (domains && domains.length > 0) {
        parsedUrls.sort((a, b) => {
          const aMatch = domains.some((d: string) => a.url.includes(d) || a.title.toLowerCase().includes(d.toLowerCase()));
          const bMatch = domains.some((d: string) => b.url.includes(d) || b.title.toLowerCase().includes(d.toLowerCase()));
          return (aMatch === bMatch) ? 0 : aMatch ? -1 : 1;
        });
      }

      const urlsToScrape = parsedUrls.slice(0, 10); // Limit to top 10

      // If no URLs found, try to fallback to a standard search output
      if (urlsToScrape.length === 0) {
        return res.json({
          markdownContent: searchResponse.text ? (searchResponse.text + "\n\n*(Sistēma neatrada konkrētas saites, bet izmantoja pieejamo informāciju.)*") : "No articles found for the given topic and sources.",
          sources: []
        });
      }

      // Stage 2: Scrape the URLs with Playwright
      const browser = await chromium.launch({ headless: true });
      const scrapedPages: { url: string, title: string, content: string }[] = [];

      // Create a single context to process pages
      const context = await browser.newContext({
         userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
         viewport: { width: 1280, height: 720 }
      });
      
      console.log(`Scraping ${urlsToScrape.length} URLs...`);
      for (const source of Object.values(urlsToScrape)) {
        let resolvedUrl = source.url;
        let content = "";
        try {
          const page = await context.newPage();
          // Skip loading images and media to speed up
          await page.route('**/*.{png,jpg,jpeg,webp,gif,css,svg,woff2}', route => route.abort());
          
          await page.goto(source.url, { timeout: 15000, waitUntil: 'domcontentloaded' });
          resolvedUrl = page.url();
          content = await page.evaluate(() => document.body.innerText.substring(0, 4000));
          await page.close();
        } catch (err) {
          console.error(`Failed to scrape ${source.url}:`, err);
        }
        if (content) {
            scrapedPages.push({ url: resolvedUrl, title: source.title, content });
        }
      }
      await browser.close();

      // Ensure we have at least something to pass, if all scraping fails we have a fallback
      if (scrapedPages.length === 0) {
         return res.json({
           markdownContent: searchResponse.text || "Articles were found, but we couldn't extract text from them. Try checking the links below.",
           sources: urlsToScrape // fallback to original urls
         });
      }

      // Stage 3: Deep Analyze with Scraped Content
      const analyzePrompt = `
        You are a smart News Aggregator for Latvia and International news.
        
        TOPIC: "${topic}"
        
        Here are the scraped contents from several news articles:
        ${scrapedPages.map(p => `\n--- SOURCE: ${p.title} (${p.url}) ---\n${p.content}`).join('\n')}
        
        YOUR MISSION:
        1. Compare the reporting across the different sources.
        2. Are there differences in the headlines, details, or causes mentioned?
        3. If the topic or sources are Latvian, respond in Latvian.
        
        OUTPUT FORMAT (Markdown):
        
        # Kopsavilkums (Summary)
        [Brief summary of the event]

        # Avotu Salīdzinājums (Source Comparison)
        - **[Source Name](URL)**: [Key details provided by this source]
        - **[Source Name](URL)**: [How this report differs]
        
        # Secinājumi (Conclusion)
        [Neutral conclusion]
      `;

      const analysisResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: analyzePrompt,
      });

      const markdownContent = analysisResponse.text || "Analysis failed.";

      // Extract sections for the AnalysisResult DB table
      const summaryMatch = markdownContent.match(/#\s*Kopsavilkums.+?\n([\s\S]*?)(?=\n#|$)/i);
      const diffMatch = markdownContent.match(/#\s*Avotu Salīdzinājums.+?\n([\s\S]*?)(?=\n#|$)/i);
      const concMatch = markdownContent.match(/#\s*Secinājumi.+?\n([\s\S]*?)(?=\n#|$)/i);
      
      const summaryStr = summaryMatch ? summaryMatch[1].trim() : markdownContent;
      const differencesStr = diffMatch ? diffMatch[1].trim() : '';
      const conclusionStr = concMatch ? concMatch[1].trim() : '';

      // Create a new Request record
      const insertRequest = db.prepare('INSERT INTO Request (Theme, Date, Filters) VALUES (?, ?, ?)');
      const requestResult = insertRequest.run(topic, new Date().toISOString(), domains.join(','));
      const requestId = requestResult.lastInsertRowid;

      // Create SourceArticle records
      const insertArticle = db.prepare('INSERT INTO SourceArticle (Request_ID, Title, URL, Source, Content, Published) VALUES (?, ?, ?, ?, ?, ?)');
      for (const page of scrapedPages) {
        let domain = 'Unknown';
        try { domain = new URL(page.url).hostname; } catch (e) {}
        insertArticle.run(requestId, page.title, page.url, domain, page.content, new Date().toISOString());
      }

      // Create AnalysisResult record
      const insertAnalysis = db.prepare('INSERT INTO AnalysisResult (Request_ID, Conclusion, Summary, Differences) VALUES (?, ?, ?, ?)');
      insertAnalysis.run(requestId, conclusionStr, summaryStr, differencesStr);

      res.json({
        markdownContent,
        sources: scrapedPages.map(p => ({ title: p.title, url: p.url }))
      });

    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/history', (req, res) => {
    try {
      const history = db.prepare(`
        SELECT 
          r.ID, 
          r.Theme, 
          r.Date, 
          r.Filters,
          a.Summary,
          a.Differences,
          a.Conclusion
        FROM Request r
        LEFT JOIN AnalysisResult a ON r.ID = a.Request_ID
        ORDER BY r.ID DESC
        LIMIT 20
      `).all();
      
      res.json(history);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/db', (req, res) => {
    try {
      const requests = db.prepare('SELECT * FROM Request ORDER BY ID DESC LIMIT 100').all();
      const articles = db.prepare('SELECT ID, Request_ID, Title, URL, Source, Published, substr(Content, 1, 50) as ContentSnippet FROM SourceArticle ORDER BY ID DESC LIMIT 500').all();
      // Omitting long Differences text for the summary view
      const analysis = db.prepare('SELECT ID, Request_ID, Conclusion, Summary FROM AnalysisResult ORDER BY ID DESC LIMIT 100').all();
      
      res.json({
        Request: requests,
        SourceArticle: articles,
        AnalysisResult: analysis
      });
    } catch (error: any) {
      console.error('Error fetching admin db data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/admin/request/:id', (req, res) => {
    try {
      const id = req.params.id;
      db.prepare('DELETE FROM SourceArticle WHERE Request_ID = ?').run(id);
      db.prepare('DELETE FROM AnalysisResult WHERE Request_ID = ?').run(id);
      db.prepare('DELETE FROM Request WHERE ID = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
