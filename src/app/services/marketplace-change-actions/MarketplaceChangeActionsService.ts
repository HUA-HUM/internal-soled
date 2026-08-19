import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BulkMarketplaceChangeActionsDTO,
  CompleteMarketplaceChangeActionDTO,
  FailMarketplaceChangeActionDTO,
  ListMarketplaceChangeActionsQueryDTO,
  MarkMarketplaceChangeActionProcessingDTO,
  SkipMarketplaceChangeActionDTO,
  UpdateMarketplaceChangeActionBullmqJobDTO,
} from 'src/app/controller/marketplace-change-actions/internal/dto/MarketplaceChangeActionDTO';
import type { ISQLMarketplaceChangeActionsRepository } from 'src/core/adapters/marketplace-change-actions/ISQLMarketplaceChangeActionsRepository';
import {
  MarketplaceChangeActionBulkItem,
  MarketplaceChangeActionAnalyticsFilters,
  MarketplaceChangeActionAnalyticsResult,
  MarketplaceChangeActionDTO,
  MarketplaceChangeActionListResult,
} from 'src/core/entitis/marketplace-change-actions/MarketplaceChangeActionTypes';

@Injectable()
export class MarketplaceChangeActionsService {
  constructor(
    @Inject('ISQLMarketplaceChangeActionsRepository')
    private readonly actionsRepository: ISQLMarketplaceChangeActionsRepository,
  ) {}

  bulkCreateOrGet(
    body: BulkMarketplaceChangeActionsDTO,
  ): Promise<MarketplaceChangeActionBulkItem[]> {
    if (!Array.isArray(body.actions) || body.actions.length === 0) {
      throw new BadRequestException('actions must be a non-empty array');
    }

    body.actions.forEach((action, index) => {
      this.validateRequiredString(
        action.actionId,
        `actions[${index}].actionId`,
      );
      this.validateRequiredString(
        action.dedupeKey,
        `actions[${index}].dedupeKey`,
      );
      this.validateRequiredString(action.source, `actions[${index}].source`);
      this.validateRequiredString(action.sku, `actions[${index}].sku`);
    });

    return this.actionsRepository.bulkCreateOrGet(body.actions);
  }

  async getByActionId(actionId: string): Promise<MarketplaceChangeActionDTO> {
    this.validateRequiredString(actionId, 'actionId');

    const action = await this.actionsRepository.getByActionId(actionId.trim());

    if (!action) {
      throw new NotFoundException('Marketplace change action not found');
    }

    return action;
  }

  list(
    query: ListMarketplaceChangeActionsQueryDTO,
  ): Promise<MarketplaceChangeActionListResult> {
    return this.actionsRepository.list({
      filters: {
        sku: query.sku,
        meliItemId: query.meliItemId,
        marketplace: query.marketplace,
        changeType: query.changeType,
        status: query.status,
        source: query.source,
      },
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });
  }

  getAnalytics(
    query: MarketplaceChangeActionAnalyticsFilters,
  ): Promise<MarketplaceChangeActionAnalyticsResult> {
    return this.actionsRepository.getAnalytics(query);
  }

  async markProcessing(
    actionId: string,
    body: MarkMarketplaceChangeActionProcessingDTO,
  ): Promise<{ ok: true; actionId: string; status: 'processing' }> {
    this.validateRequiredString(actionId, 'actionId');

    const action = await this.actionsRepository.markProcessing(
      actionId.trim(),
      body,
    );

    if (!action) {
      throw new NotFoundException('Marketplace change action not found');
    }

    return { ok: true, actionId: action.actionId, status: 'processing' };
  }

  async complete(
    actionId: string,
    body: CompleteMarketplaceChangeActionDTO,
  ): Promise<{ ok: true; actionId: string; status: 'completed' }> {
    this.validateRequiredString(actionId, 'actionId');

    const action = await this.actionsRepository.complete(actionId.trim(), body);

    if (!action) {
      throw new NotFoundException('Marketplace change action not found');
    }

    return { ok: true, actionId: action.actionId, status: 'completed' };
  }

  async fail(
    actionId: string,
    body: FailMarketplaceChangeActionDTO,
  ): Promise<{ ok: true; actionId: string; status: 'failed' }> {
    this.validateRequiredString(actionId, 'actionId');

    const action = await this.actionsRepository.fail(actionId.trim(), body);

    if (!action) {
      throw new NotFoundException('Marketplace change action not found');
    }

    return { ok: true, actionId: action.actionId, status: 'failed' };
  }

  async skip(
    actionId: string,
    body: SkipMarketplaceChangeActionDTO,
  ): Promise<{ ok: true; actionId: string; status: 'skipped' }> {
    this.validateRequiredString(actionId, 'actionId');

    const action = await this.actionsRepository.skip(actionId.trim(), body);

    if (!action) {
      throw new NotFoundException('Marketplace change action not found');
    }

    return { ok: true, actionId: action.actionId, status: 'skipped' };
  }

  async updateBullmqJobId(
    actionId: string,
    body: UpdateMarketplaceChangeActionBullmqJobDTO,
  ): Promise<{ ok: true; actionId: string; bullmqJobId: string }> {
    this.validateRequiredString(actionId, 'actionId');
    this.validateRequiredString(body.bullmqJobId, 'bullmqJobId');

    const action = await this.actionsRepository.updateBullmqJobId(
      actionId.trim(),
      body.bullmqJobId.trim(),
    );

    if (!action) {
      throw new NotFoundException('Marketplace change action not found');
    }

    return {
      ok: true,
      actionId: action.actionId,
      bullmqJobId: action.bullmqJobId ?? body.bullmqJobId,
    };
  }

  private validateRequiredString(
    value: string | undefined,
    label: string,
  ): void {
    if (!value || value.trim() === '') {
      throw new BadRequestException(`${label} is required`);
    }
  }
}
