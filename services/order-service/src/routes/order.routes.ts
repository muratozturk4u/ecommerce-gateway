import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { OrderService } from '../services/order.service';
import { OrderRepository } from '../repositories/order.repository';
import { OrderModel } from '../models/order.model';

const orderRepository = new OrderRepository(OrderModel);
const orderService = new OrderService(orderRepository);
const orderController = new OrderController(orderService);

const router = Router();

router.post('/orders', orderController.create.bind(orderController));
router.get('/orders', orderController.getAll.bind(orderController));
router.get('/orders/:id', orderController.getById.bind(orderController));
router.patch('/orders/:id/status', orderController.updateStatus.bind(orderController));

export { router as orderRouter };
