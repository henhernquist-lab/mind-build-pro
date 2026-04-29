import { Router, type IRouter } from "express";
import healthRouter from "./health";
import podcastRouter from "./podcast";
import weatherRouter from "./weather";
import youtubeRouter from "./youtube";

const router: IRouter = Router();

router.use(healthRouter);
router.use(podcastRouter);
router.use(weatherRouter);
router.use(youtubeRouter);

export default router;
