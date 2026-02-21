// payment.routes.ts
import { Router } from "express";
import { paymentController } from "./payment.controller";
import bodyParser from "body-parser";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";

const router = Router();


// Create checkout session
router.post("/create-checkout-session", auth(USER_ROLE.EMPLOYER), paymentController.createCheckoutSession);

// Cancel subscription
router.post("/cancel-subscription", paymentController.cancelSubscription);


export const paymentRoutes = router;
