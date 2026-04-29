import { Router, type IRouter } from "express";
import healthRouter from "./health";
import podcastRouter from "./podcast";

const router: IRouter = Router();

router.use(healthRouter);
router.use(podcastRouter);

export default router;
