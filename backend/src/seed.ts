import { initDatabase, queryAll, execute, saveDb } from './database';

async function seed() {
  await initDatabase();

  // Проверяем, пусты ли таблицы
  const services = queryAll<{ cnt: number }>('SELECT COUNT(*) as cnt FROM services');
  if (services[0].cnt === 0) {
    console.log('🌱 Добавляю демо-услуги...');
    execute('INSERT INTO services (name, format, base_price, design_price) VALUES (?, ?, ?, ?)', ['Визитки', '90x50', 3.50, 100]);
    execute('INSERT INTO services (name, format, base_price, design_price) VALUES (?, ?, ?, ?)', ['Флаеры', 'А5', 4.00, 150]);
    execute('INSERT INTO services (name, format, base_price, design_price) VALUES (?, ?, ?, ?)', ['Флаеры', 'А6', 3.00, 120]);
    execute('INSERT INTO services (name, format, base_price, design_price) VALUES (?, ?, ?, ?)', ['Листовки', 'А4', 6.00, 200]);
    execute('INSERT INTO services (name, format, base_price, design_price) VALUES (?, ?, ?, ?)', ['Буклеты', 'А4 (2 фальца)', 12.00, 250]);
    execute('INSERT INTO services (name, format, base_price, design_price) VALUES (?, ?, ?, ?)', ['Наклейки', 'А5', 8.00, 150]);
    execute('INSERT INTO services (name, format, base_price, design_price) VALUES (?, ?, ?, ?)', ['Календари', 'А3', 25.00, 300]);
    execute('INSERT INTO services (name, format, base_price, design_price) VALUES (?, ?, ?, ?)', ['Бланки', 'А4', 5.00, 0]);
  }

  const polyMats = queryAll<{ cnt: number }>('SELECT COUNT(*) as cnt FROM materials_poligraphy');
  if (polyMats[0].cnt === 0) {
    console.log('🌱 Добавляю материалы для полиграфии...');
    execute('INSERT INTO materials_poligraphy (name, price) VALUES (?, ?)', ['Бумага мелованная 350г', 350]);
    execute('INSERT INTO materials_poligraphy (name, price) VALUES (?, ?)', ['Бумага мелованная 250г', 280]);
    execute('INSERT INTO materials_poligraphy (name, price) VALUES (?, ?)', ['Краска CMYK (комплект)', 450]);
    execute('INSERT INTO materials_poligraphy (name, price) VALUES (?, ?)', ['Пленка для ламинации А4', 120]);
    execute('INSERT INTO materials_poligraphy (name, price) VALUES (?, ?)', ['Картон для упаковки', 200]);
    execute('INSERT INTO materials_poligraphy (name, price) VALUES (?, ?)', ['Скрепки для брошюр', 80]);
  }

  const epoxyMats = queryAll<{ cnt: number }>('SELECT COUNT(*) as cnt FROM materials_epoxy');
  if (epoxyMats[0].cnt === 0) {
    console.log('🌱 Добавляю материалы для эпоксидки...');
    execute('INSERT INTO materials_epoxy (name, price) VALUES (?, ?)', ['Эпоксидная смола (комп А+Б)', 850]);
    execute('INSERT INTO materials_epoxy (name, price) VALUES (?, ?)', ['Силиконовый молд подсвечник', 350]);
    execute('INSERT INTO materials_epoxy (name, price) VALUES (?, ?)', ['Высокопрочный гипс', 180]);
    execute('INSERT INTO materials_epoxy (name, price) VALUES (?, ?)', ['Пигмент белый', 120]);
    execute('INSERT INTO materials_epoxy (name, price) VALUES (?, ?)', ['Пигмент золотой', 150]);
    execute('INSERT INTO materials_epoxy (name, price) VALUES (?, ?)', ['Глянцевый лак', 220]);
    execute('INSERT INTO materials_epoxy (name, price) VALUES (?, ?)', ['Мерный стаканчик', 30]);
    execute('INSERT INTO materials_epoxy (name, price) VALUES (?, ?)', ['Перчатки латексные', 60]);
  }

  saveDb();

  const svcCount = queryAll<{ cnt: number }>('SELECT COUNT(*) as cnt FROM services')[0].cnt;
  const polyCount = queryAll<{ cnt: number }>('SELECT COUNT(*) as cnt FROM materials_poligraphy')[0].cnt;
  const epoxyCount = queryAll<{ cnt: number }>('SELECT COUNT(*) as cnt FROM materials_epoxy')[0].cnt;

  console.log(`\n✅ Данные добавлены:`);
  console.log(`   📋 Услуг: ${svcCount}`);
  console.log(`   📦 Материалов (полигр): ${polyCount}`);
  console.log(`   🧪 Материалов (эпокси): ${epoxyCount}`);
}

seed().catch(console.error);
