import { Router, type IRouter } from "express";
import healthRouter from "./health";
import craftCvRouter from "./craftcv";

const router: IRouter = Router();

router.use(healthRouter);
router.use(craftCvRouter);

export default router;
