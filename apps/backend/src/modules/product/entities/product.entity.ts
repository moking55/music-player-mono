import { ProductStatus } from 'shared-types';
import { Column, Entity, Index } from 'typeorm';

import { BaseCustomEntity } from '../../../common/utils/base-entity';

import type { Product as IProduct } from 'shared-types';

@Entity('products')
export class ProductEntity extends BaseCustomEntity implements IProduct {
  @Column({ length: 255 })
  @Index({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'archived'] as const,
    default: 'active',
  })
  status: ProductStatus;
}
