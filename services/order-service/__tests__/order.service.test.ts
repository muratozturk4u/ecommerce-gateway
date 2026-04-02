import { OrderService } from '../src/services/order.service';
import { IOrderRepository } from '../src/interfaces/order-repository.interface';
import { IOrderDocument, CreateOrderDto, OrderStatus } from '../src/interfaces/order.interface';

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439012';

const validItem = {
  productId: '507f1f77bcf86cd799439013',
  productName: 'Test Product',
  quantity: 2,
  unitPrice: 50,
  totalPrice: 100
};

const mockOrder = {
  id: '507f1f77bcf86cd799439020',
  _id: '507f1f77bcf86cd799439020',
  userId: USER_ID,
  items: [validItem],
  totalAmount: 100,
  status: 'pending',
  shippingAddress: { street: '123 Main St', city: 'Istanbul', zip: '34000' },
  createdAt: new Date('2026-03-28T10:00:00.000Z'),
  updatedAt: new Date('2026-03-28T10:00:00.000Z')
} as unknown as IOrderDocument;

function createMockRepository(): jest.Mocked<IOrderRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    updateStatus: jest.fn()
  };
}

describe('OrderService', () => {
  let service: OrderService;
  let repository: jest.Mocked<IOrderRepository>;

  beforeEach(() => {
    repository = createMockRepository();
    service = new OrderService(repository);
  });

  describe('create', () => {
    it('should create order with valid data and return it', async () => {
      const dto: CreateOrderDto = {
        userId: USER_ID,
        items: [validItem],
        totalAmount: 100
      };
      repository.create.mockResolvedValue(mockOrder);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        id: mockOrder.id,
        userId: mockOrder.userId,
        items: mockOrder.items,
        totalAmount: mockOrder.totalAmount,
        status: mockOrder.status,
        shippingAddress: mockOrder.shippingAddress,
        createdAt: mockOrder.createdAt,
        updatedAt: mockOrder.updatedAt
      });
    });

    it('should accept order without shippingAddress', async () => {
      const dto: CreateOrderDto = {
        userId: USER_ID,
        items: [validItem],
        totalAmount: 100
      };
      const orderWithoutAddress = {
        ...mockOrder,
        shippingAddress: undefined
      } as unknown as IOrderDocument;
      repository.create.mockResolvedValue(orderWithoutAddress);

      const result = await service.create(dto);

      expect(result.shippingAddress).toBeUndefined();
    });

    it('should accept order with shippingAddress', async () => {
      const dto: CreateOrderDto = {
        userId: USER_ID,
        items: [validItem],
        totalAmount: 100,
        shippingAddress: { street: '123 Main St', city: 'Istanbul', zip: '34000' }
      };
      repository.create.mockResolvedValue(mockOrder);

      const result = await service.create(dto);

      expect(result.shippingAddress).toEqual({ street: '123 Main St', city: 'Istanbul', zip: '34000' });
    });

    it('should reject when totalAmount does not match sum of item prices', async () => {
      const dto: CreateOrderDto = {
        userId: USER_ID,
        items: [validItem],
        totalAmount: 999
      };

      await expect(service.create(dto)).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'TOTAL_AMOUNT_MISMATCH' })
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject when item totalPrice does not match quantity * unitPrice', async () => {
      const badItem = { ...validItem, totalPrice: 999 };
      const dto: CreateOrderDto = {
        userId: USER_ID,
        items: [badItem],
        totalAmount: 999
      };

      await expect(service.create(dto)).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'ITEM_PRICE_MISMATCH' })
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create order with multiple items', async () => {
      const secondItem = {
        productId: '507f1f77bcf86cd799439014',
        productName: 'Second Product',
        quantity: 3,
        unitPrice: 30,
        totalPrice: 90
      };
      const dto: CreateOrderDto = {
        userId: USER_ID,
        items: [validItem, secondItem],
        totalAmount: 190
      };
      const multiItemOrder = {
        ...mockOrder,
        items: [validItem, secondItem],
        totalAmount: 190
      } as unknown as IOrderDocument;
      repository.create.mockResolvedValue(multiItemOrder);

      const result = await service.create(dto);

      expect(result.items).toHaveLength(2);
      expect(result.totalAmount).toBe(190);
    });
  });

  describe('getById', () => {
    it('should return order when found and userId matches', async () => {
      repository.findById.mockResolvedValue(mockOrder);

      const result = await service.getById(mockOrder.id, USER_ID, 'customer');

      expect(repository.findById).toHaveBeenCalledWith(mockOrder.id);
      expect(result.id).toBe(mockOrder.id);
    });

    it('should return order when admin regardless of userId', async () => {
      repository.findById.mockResolvedValue(mockOrder);

      const result = await service.getById(mockOrder.id, OTHER_USER_ID, 'admin');

      expect(result.id).toBe(mockOrder.id);
    });

    it('should throw 404 when order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getById(mockOrder.id, USER_ID, 'customer')).rejects.toEqual(
        expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' })
      );
    });

    it('should throw 404 when userId does not match (non-admin)', async () => {
      repository.findById.mockResolvedValue(mockOrder);

      await expect(service.getById(mockOrder.id, OTHER_USER_ID, 'customer')).rejects.toEqual(
        expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' })
      );
    });

    it('should throw 400 when orderId is invalid ObjectId', async () => {
      await expect(service.getById('invalid-id', USER_ID, 'customer')).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' })
      );
      expect(repository.findById).not.toHaveBeenCalled();
    });
  });

  describe('getByUser', () => {
    const defaultQuery = { page: 1, limit: 10 };

    it('should return paginated orders for customer (calls findByUserId)', async () => {
      repository.findByUserId.mockResolvedValue({ docs: [mockOrder], total: 1 });

      const result = await service.getByUser(USER_ID, 'customer', defaultQuery);

      expect(repository.findByUserId).toHaveBeenCalledWith(USER_ID, 1, 10, undefined);
      expect(repository.findAll).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('should return all orders for admin (calls findAll)', async () => {
      repository.findAll.mockResolvedValue({ docs: [mockOrder], total: 1 });

      const result = await service.getByUser(USER_ID, 'admin', defaultQuery);

      expect(repository.findAll).toHaveBeenCalledWith(1, 10, undefined);
      expect(repository.findByUserId).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('should apply status filter when provided', async () => {
      const queryWithStatus = { page: 1, limit: 10, status: 'pending' as OrderStatus };
      repository.findByUserId.mockResolvedValue({ docs: [mockOrder], total: 1 });

      await service.getByUser(USER_ID, 'customer', queryWithStatus);

      expect(repository.findByUserId).toHaveBeenCalledWith(USER_ID, 1, 10, 'pending');
    });

    it('should return empty array when no orders', async () => {
      repository.findByUserId.mockResolvedValue({ docs: [], total: 0 });

      const result = await service.getByUser(USER_ID, 'customer', defaultQuery);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      repository.findByUserId.mockResolvedValue({ docs: [mockOrder], total: 25 });

      const result = await service.getByUser(USER_ID, 'customer', defaultQuery);

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('updateStatus', () => {
    it('should update pending to confirmed (admin)', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' } as unknown as IOrderDocument;
      const confirmedOrder = { ...mockOrder, status: 'confirmed' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(pendingOrder);
      repository.updateStatus.mockResolvedValue(confirmedOrder);

      const result = await service.updateStatus(mockOrder.id, 'confirmed', USER_ID, 'admin');

      expect(repository.updateStatus).toHaveBeenCalledWith(mockOrder.id, 'pending', 'confirmed');
      expect(result.status).toBe('confirmed');
    });

    it('should update confirmed to shipped (admin)', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' } as unknown as IOrderDocument;
      const shippedOrder = { ...mockOrder, status: 'shipped' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(confirmedOrder);
      repository.updateStatus.mockResolvedValue(shippedOrder);

      const result = await service.updateStatus(mockOrder.id, 'shipped', USER_ID, 'admin');

      expect(result.status).toBe('shipped');
    });

    it('should update shipped to delivered (admin)', async () => {
      const shippedOrder = { ...mockOrder, status: 'shipped' } as unknown as IOrderDocument;
      const deliveredOrder = { ...mockOrder, status: 'delivered' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(shippedOrder);
      repository.updateStatus.mockResolvedValue(deliveredOrder);

      const result = await service.updateStatus(mockOrder.id, 'delivered', USER_ID, 'admin');

      expect(result.status).toBe('delivered');
    });

    it('should update pending to cancelled (admin)', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' } as unknown as IOrderDocument;
      const cancelledOrder = { ...mockOrder, status: 'cancelled' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(pendingOrder);
      repository.updateStatus.mockResolvedValue(cancelledOrder);

      const result = await service.updateStatus(mockOrder.id, 'cancelled', USER_ID, 'admin');

      expect(result.status).toBe('cancelled');
    });

    it('should allow owner to cancel pending order', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' } as unknown as IOrderDocument;
      const cancelledOrder = { ...mockOrder, status: 'cancelled' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(pendingOrder);
      repository.updateStatus.mockResolvedValue(cancelledOrder);

      const result = await service.updateStatus(mockOrder.id, 'cancelled', USER_ID, 'customer');

      expect(result.status).toBe('cancelled');
    });

    it('should reject owner trying to cancel non-pending order (confirmed -> cancelled by owner)', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(confirmedOrder);

      await expect(
        service.updateStatus(mockOrder.id, 'cancelled', USER_ID, 'customer')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' })
      );
    });

    it('should reject owner trying non-cancel transition (pending -> confirmed by owner)', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(pendingOrder);

      await expect(
        service.updateStatus(mockOrder.id, 'confirmed', USER_ID, 'customer')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' })
      );
    });

    it('should reject non-owner customer', async () => {
      repository.findById.mockResolvedValue(mockOrder);

      await expect(
        service.updateStatus(mockOrder.id, 'cancelled', OTHER_USER_ID, 'customer')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 403, code: 'FORBIDDEN' })
      );
    });

    it('should reject invalid transition: delivered to confirmed', async () => {
      const deliveredOrder = { ...mockOrder, status: 'delivered' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(deliveredOrder);

      await expect(
        service.updateStatus(mockOrder.id, 'confirmed', USER_ID, 'admin')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'INVALID_STATUS_TRANSITION' })
      );
    });

    it('should reject invalid transition: cancelled to confirmed', async () => {
      const cancelledOrder = { ...mockOrder, status: 'cancelled' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(cancelledOrder);

      await expect(
        service.updateStatus(mockOrder.id, 'confirmed', USER_ID, 'admin')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'INVALID_STATUS_TRANSITION' })
      );
    });

    it('should reject invalid transition: confirmed to pending', async () => {
      const confirmedOrder = { ...mockOrder, status: 'confirmed' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(confirmedOrder);

      await expect(
        service.updateStatus(mockOrder.id, 'pending', USER_ID, 'admin')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'INVALID_STATUS_TRANSITION' })
      );
    });

    it('should reject invalid transition: pending to shipped (skip)', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(pendingOrder);

      await expect(
        service.updateStatus(mockOrder.id, 'shipped', USER_ID, 'admin')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'INVALID_STATUS_TRANSITION' })
      );
    });

    it('should reject same status transition: pending to pending', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(pendingOrder);

      await expect(
        service.updateStatus(mockOrder.id, 'pending', USER_ID, 'admin')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'INVALID_STATUS_TRANSITION' })
      );
    });

    it('should throw 404 when order not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateStatus(mockOrder.id, 'confirmed', USER_ID, 'admin')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' })
      );
    });

    it('should handle concurrent status update (updateStatus returns null)', async () => {
      const pendingOrder = { ...mockOrder, status: 'pending' } as unknown as IOrderDocument;
      repository.findById.mockResolvedValue(pendingOrder);
      repository.updateStatus.mockResolvedValue(null);

      await expect(
        service.updateStatus(mockOrder.id, 'confirmed', USER_ID, 'admin')
      ).rejects.toEqual(
        expect.objectContaining({ statusCode: 400, code: 'INVALID_STATUS_TRANSITION' })
      );
    });
  });
});
