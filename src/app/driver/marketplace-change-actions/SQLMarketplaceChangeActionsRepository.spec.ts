import { EntityManager } from 'typeorm';
import { SQLMarketplaceChangeActionsRepository } from './SQLMarketplaceChangeActionsRepository';

describe('SQLMarketplaceChangeActionsRepository analytics', () => {
  it('normalizes analytics results and applies the requested filters', async () => {
    const query = jest.fn<Promise<unknown>, [string, unknown[]?]>();
    query
      .mockResolvedValueOnce([
        {
          total_actions: '10',
          completed_actions: '8',
          failed_actions: '1',
          pending_actions: '1',
          unique_skus: '7',
          unique_meli_items: '6',
          activations: '2',
          completed_activations: '1',
          price_changes: '4',
          completed_price_changes: '4',
          stock_changes: '3',
          completed_stock_changes: '2',
          status_changes: '3',
          completed_status_changes: '2',
          average_processing_time_ms: '125.456',
        },
      ])
      .mockResolvedValueOnce([
        { name: 'price', total: '4', completed: '4', failed: '0' },
      ])
      .mockResolvedValueOnce([{ name: 'completed', total: '8' }])
      .mockResolvedValueOnce([
        { name: 'fravega', total: '10', completed: '8', failed: '1' },
      ])
      .mockResolvedValueOnce([
        { name: 'Samsung', total: '3', completed: '3', failed: '0' },
      ])
      .mockResolvedValueOnce([
        {
          name: 'mercadolibre_webhook',
          total: '10',
          completed: '8',
          failed: '1',
        },
      ])
      .mockResolvedValueOnce([
        { hour: '17', total: '5', completed: '4', failed: '1' },
      ])
      .mockResolvedValueOnce([
        {
          sku: 'JDCW1512001-4',
          total: '3',
          completed: '2',
          failed: '1',
          price_changes: '2',
          stock_changes: '1',
          status_changes: '0',
        },
      ])
      .mockResolvedValueOnce([
        { code: 'HTTP_400', message: 'Bad request', total: '1' },
      ]);
    const repository = new SQLMarketplaceChangeActionsRepository({
      query,
    } as unknown as EntityManager);

    const result = await repository.getAnalytics({
      date: '2026-08-19',
      marketplace: 'fravega',
      source: 'mercadolibre_webhook',
    });

    expect(result.summary).toEqual({
      totalActions: 10,
      completedActions: 8,
      failedActions: 1,
      pendingActions: 1,
      successRate: 80,
      uniqueSkus: 7,
      uniqueMeliItems: 6,
      activations: 2,
      completedActivations: 1,
      priceChanges: 4,
      completedPriceChanges: 4,
      stockChanges: 3,
      completedStockChanges: 2,
      statusChanges: 3,
      completedStatusChanges: 2,
      averageProcessingTimeMs: 125.46,
    });
    expect(result.byBrand[0]).toEqual({
      name: 'Samsung',
      total: 3,
      completed: 3,
      failed: 0,
    });
    expect(result.byHour).toHaveLength(24);
    expect(result.byHour[16].total).toBe(0);
    expect(result.byHour[17]).toEqual({
      hour: 17,
      total: 5,
      completed: 4,
      failed: 1,
    });
    expect(query).toHaveBeenCalledTimes(9);
    expect(query.mock.calls[0][1]).toEqual([
      '2026-08-19 00:00:00',
      '2026-08-19 00:00:00',
      'fravega',
      'mercadolibre_webhook',
    ]);
  });

  it('uses the database current date when date is omitted', async () => {
    const query = jest.fn<Promise<unknown>, [string, unknown[]?]>();
    query
      .mockResolvedValueOnce([{ date: '2026-08-19' }])
      .mockResolvedValueOnce([{}]);

    for (let index = 0; index < 8; index += 1) {
      query.mockResolvedValueOnce([]);
    }

    const repository = new SQLMarketplaceChangeActionsRepository({
      query,
    } as unknown as EntityManager);
    const result = await repository.getAnalytics({});

    expect(result.period.date).toBe('2026-08-19');
    expect(query.mock.calls[1][1]).toEqual([
      '2026-08-19 00:00:00',
      '2026-08-19 00:00:00',
    ]);
  });
});
