import {
  CreateMarketplaceChangeActionInput,
  MarketplaceChangeActionBulkItem,
  MarketplaceChangeActionDTO,
  MarketplaceChangeActionFilters,
  MarketplaceChangeActionListResult,
} from 'src/core/entitis/marketplace-change-actions/MarketplaceChangeActionTypes';

export interface ISQLMarketplaceChangeActionsRepository {
  bulkCreateOrGet(
    actions: CreateMarketplaceChangeActionInput[],
  ): Promise<MarketplaceChangeActionBulkItem[]>;
  getByActionId(actionId: string): Promise<MarketplaceChangeActionDTO | null>;
  list(params: {
    filters: MarketplaceChangeActionFilters;
    limit: number;
    offset: number;
  }): Promise<MarketplaceChangeActionListResult>;
  markProcessing(
    actionId: string,
    input: {
      attempts: number;
      bullmqJobId?: string | null;
    },
  ): Promise<MarketplaceChangeActionDTO | null>;
  complete(
    actionId: string,
    input: {
      requestSnapshot?: unknown;
      responseSnapshot?: unknown;
    },
  ): Promise<MarketplaceChangeActionDTO | null>;
  fail(
    actionId: string,
    input: {
      attempts: number;
      errorCode: string;
      errorMessage: string;
      requestSnapshot?: unknown;
      responseSnapshot?: unknown;
    },
  ): Promise<MarketplaceChangeActionDTO | null>;
  skip(
    actionId: string,
    input: {
      reason: string;
      responseSnapshot?: unknown;
    },
  ): Promise<MarketplaceChangeActionDTO | null>;
  updateBullmqJobId(
    actionId: string,
    bullmqJobId: string,
  ): Promise<MarketplaceChangeActionDTO | null>;
}
