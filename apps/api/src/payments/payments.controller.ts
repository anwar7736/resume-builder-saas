import { Controller, Get, HttpException, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthenticatedRequest } from "../common/authenticated-request";
import { isRecord } from "../common/identity";
import { UserSessionGuard } from "../common/session.guards";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("plans")
  getPlans(@Res() response: Response) {
    return response.setHeader("Cache-Control", "no-store").status(200).json(this.payments.getPlans());
  }

  @Post("checkout")
  @UseGuards(UserSessionGuard)
  async checkout(@Req() request: AuthenticatedRequest, @Res() response: Response) {
    try {
      const result = await this.payments.createCheckout(request.userId ?? "", request.body);
      return response.setHeader("Cache-Control", "no-store").status(200).json(result);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Unable to create an SSLCommerz checkout.", error);
      return response.status(500).json({ error: "Unable to start the payment right now." });
    }
  }

  @Post("sslcommerz/success")
  async success(@Req() request: Request, @Res() response: Response) {
    const body = isRecord(request.body) ? request.body : {};
    const transactionId = typeof body.tran_id === "string" ? body.tran_id : "";
    const validationId = typeof body.val_id === "string" ? body.val_id : "";
    try {
      const payment = await this.payments.verifyAndActivate(transactionId, validationId);
      return response.redirect(303, this.payments.getReturnUrl(
        payment ? "success" : "verification_error",
        payment?.plan,
      ));
    } catch (error) {
      console.error("Unable to verify an SSLCommerz success callback.", error);
      return response.redirect(303, this.payments.getReturnUrl("verification_error"));
    }
  }

  @Post("sslcommerz/fail")
  async fail(@Req() request: Request, @Res() response: Response) {
    const transactionId = isRecord(request.body) && typeof request.body.tran_id === "string"
      ? request.body.tran_id
      : "";
    try {
      await this.payments.markUnsuccessful(transactionId, "failed");
      return response.redirect(303, this.payments.getReturnUrl("failed"));
    } catch (error) {
      console.error("Unable to record an SSLCommerz failure callback.", error);
      return response.redirect(303, this.payments.getReturnUrl("verification_error"));
    }
  }

  @Post("sslcommerz/cancel")
  async cancel(@Req() request: Request, @Res() response: Response) {
    const transactionId = isRecord(request.body) && typeof request.body.tran_id === "string"
      ? request.body.tran_id
      : "";
    try {
      await this.payments.markUnsuccessful(transactionId, "cancelled");
      return response.redirect(303, this.payments.getReturnUrl("cancelled"));
    } catch (error) {
      console.error("Unable to record an SSLCommerz cancellation callback.", error);
      return response.redirect(303, this.payments.getReturnUrl("verification_error"));
    }
  }

  @Post("sslcommerz/ipn")
  async ipn(@Req() request: Request, @Res() response: Response) {
    const body = isRecord(request.body) ? request.body : {};
    const transactionId = typeof body.tran_id === "string" ? body.tran_id : "";
    const validationId = typeof body.val_id === "string" ? body.val_id : "";
    try {
      const payment = await this.payments.verifyAndActivate(transactionId, validationId);
      return payment
        ? response.status(200).json({ success: true })
        : response.status(400).json({ error: "Payment could not be verified." });
    } catch (error) {
      console.error("Unable to verify an SSLCommerz IPN.", error);
      return response.status(502).json({ error: "Unable to verify payment." });
    }
  }
}
