import { NewsSite } from './types';

export const DEFAULT_NEWS_SITES: NewsSite[] = [
  { id: '1', name: 'Delfi', domain: 'delfi.lv', country: 'LV', selected: true },
  { id: '2', name: 'TVNET', domain: 'tvnet.lv', country: 'LV', selected: true },
  { id: '3', name: 'LSM', domain: 'lsm.lv', country: 'LV', selected: false },
  { id: '4', name: 'Jauns.lv', domain: 'jauns.lv', country: 'LV', selected: false },
  { id: '5', name: 'BBC News', domain: 'bbc.com', country: 'Intl', selected: false },
  { id: '6', name: 'Reuters', domain: 'reuters.com', country: 'Intl', selected: false },
  { id: '7', name: 'CNN', domain: 'cnn.com', country: 'Intl', selected: false },
  { id: '8', name: 'NRA', domain: 'nra.lv', country: 'LV', selected: false },
  { id: '9', name: 'Apollo', domain: 'apollo.lv', country: 'LV', selected: false },
  { id: '10', name: 'TV3', domain: 'tv3.lv', country: 'LV', selected: false },
  { id: '11', name: 'LA.lv', domain: 'la.lv', country: 'LV', selected: false },
  { id: '12', name: 'Diena', domain: 'diena.lv', country: 'LV', selected: false },
];

export const SUGGESTED_TOPICS = [
  "Rail Baltica progress",
  "Inflation rates in Latvia",
  "Eurovision 2024 results",
  "Renewable energy policies EU",
];