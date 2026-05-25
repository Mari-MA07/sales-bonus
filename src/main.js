/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountCoefficient = 1 - (discount / 100);
    return sale_price * quantity * discountCoefficient;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    // Первое место (индекс 0) - 15%
    if (index === 0) {
        return profit * 0.15;
    } 
    // Второе и третье место (индексы 1 и 2) - 10%
    else if (index === 1 || index === 2) {
        return profit * 0.10;
    }
    // Последнее место (индекс total - 1) - 0%
    else if (index === total - 1) {
        return 0;
    }
    // Все остальные - 5%
    else {
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data 
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.customers) || data.customers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций
    if (!options || typeof options !== 'object') {
        throw new Error('Опции не переданы или имеют неверный формат');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Отсутствуют необходимые функции');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        firstName: seller.first_name,
        lastName: seller.last_name,
        position: seller.position,
        totalRevenue: 0,
        totalProfit: 0,
        salesCount: 0,
        products_sold: {}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(
        sellerStats.map(seller => [seller.id, seller])
    );

    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];

        seller.salesCount += 1;
        seller.totalRevenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            
            const cost = product.purchase_price * item.quantity;
            
            const purchaseData = {
                discount: item.discount,
                sale_price: item.sale_price,
                quantity: item.quantity
            };
            const revenue = calculateRevenue(purchaseData, product);
            
            const profit = revenue - cost;
            seller.totalProfit += profit;
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // @TODO: Сортировка продавцов по прибыли (по убыванию)
    sellerStats.sort((a, b) => b.totalProfit - a.totalProfit);

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => {
        // Формируем топ-10 товаров (или меньше, если товаров меньше 10)
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
        
        return {
            seller_id: seller.id,
            name: `${seller.firstName} ${seller.lastName}`,
            revenue: +seller.totalRevenue.toFixed(2),
            profit: +seller.totalProfit.toFixed(2),
            sales_count: seller.salesCount,
            top_products: topProducts,
            bonus: +seller.bonus.toFixed(2)
        };
    });
}