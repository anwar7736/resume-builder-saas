import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanPayments1720000000000 implements MigrationInterface {
  name = "AddPlanPayments1720000000000";

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "plan_expires_at" timestamptz`);
    await queryRunner.query(`
      UPDATE "app_settings"
      SET "content" = jsonb_set(
        jsonb_set(
          "content",
          '{home,plansDescription}',
          CASE
            WHEN "content"->'home'->>'plansDescription' =
              'Start free and choose the level of room you need. Plan upgrades are managed by the site team.'
            THEN '"Start free, then upgrade with secure monthly checkout when you need more room."'
            ELSE "content"->'home'->'plansDescription'
          END
        ),
        '{home,plansDisclaimer}',
        CASE
          WHEN "content"->'home'->>'plansDisclaimer' =
            'Online checkout is not enabled. Premium and Platinum plans are assigned by an administrator.'
          THEN '"Paid plans last one month per successful payment. They do not renew automatically."'
          ELSE "content"->'home'->'plansDisclaimer'
        END
      )
      WHERE "id" = 'site-settings'
        AND (
          "content"->'home'->>'plansDescription' =
            'Start free and choose the level of room you need. Plan upgrades are managed by the site team.'
          OR "content"->'home'->>'plansDisclaimer' =
            'Online checkout is not enabled. Premium and Platinum plans are assigned by an administrator.'
        )
    `);
    await queryRunner.query(`
      CREATE TABLE "payment_transactions" (
        "id" varchar(24) PRIMARY KEY,
        "user_id" varchar(24) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "plan" varchar(20) NOT NULL,
        "transaction_id" varchar(24) NOT NULL,
        "amount" numeric(10, 2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'BDT',
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "paid_at" timestamptz,
        "expires_at" timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "payment_transactions_transaction_id_unique"
      ON "payment_transactions" ("transaction_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "payment_transactions_user_id_idx"
      ON "payment_transactions" ("user_id")
    `);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`DROP TABLE "payment_transactions"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "plan_expires_at"`);
  }
}
