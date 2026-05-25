import { StockItem } from '../types';

const KEY = 'inventory_items';

export function loadItems(): StockItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(items: StockItem[]): StockItem[] {
  localStorage.setItem(KEY, JSON.stringify(items));
  return items;
}

export function addItem(item: StockItem): StockItem[] {
  return save([...loadItems(), item]);
}

export function updateItem(item: StockItem): StockItem[] {
  return save(loadItems().map(i => i.id === item.id ? item : i));
}

export function deleteItem(id: string): StockItem[] {
  return save(loadItems().filter(i => i.id !== id));
}
