import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateLegacyPackagePrices1730000000000 implements MigrationInterface {
  name = "UpdateLegacyPackagePrices1730000000000";

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`
      UPDATE "app_settings" AS settings
      SET "content" = jsonb_set(
        settings."content",
        '{plans}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN package->>'id' = 'Free' AND package->>'price' = '$0'
                THEN jsonb_set(package, '{price}', '"BDT 0"'::jsonb)
              WHEN package->>'id' = 'Premium' AND package->>'price' IN ('$8', '৳500')
                THEN jsonb_set(package, '{price}', '"BDT 500"'::jsonb)
              WHEN package->>'id' = 'Platinum' AND package->>'price' IN ('$16', '৳1,000')
                THEN jsonb_set(package, '{price}', '"BDT 1,000"'::jsonb)
              ELSE package
            END
            ORDER BY ordinal
          )
          FROM jsonb_array_elements(settings."content"->'plans')
            WITH ORDINALITY AS packages(package, ordinal)
        )
      )
      WHERE settings."id" = 'site-settings'
        AND (
          settings."content"->'plans' @> '[{"id":"Premium","price":"$8"}]'::jsonb
          OR settings."content"->'plans' @> '[{"id":"Free","price":"$0"}]'::jsonb
          OR settings."content"->'plans' @> '[{"id":"Premium","price":"৳500"}]'::jsonb
          OR settings."content"->'plans' @> '[{"id":"Platinum","price":"$16"}]'::jsonb
          OR settings."content"->'plans' @> '[{"id":"Platinum","price":"৳1,000"}]'::jsonb
        )
    `);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`
      UPDATE "app_settings" AS settings
      SET "content" = jsonb_set(
        settings."content",
        '{plans}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN package->>'id' = 'Free' AND package->>'price' = 'BDT 0'
                THEN jsonb_set(package, '{price}', '"$0"'::jsonb)
              WHEN package->>'id' = 'Premium' AND package->>'price' = 'BDT 500'
                THEN jsonb_set(package, '{price}', '"$8"'::jsonb)
              WHEN package->>'id' = 'Platinum' AND package->>'price' = 'BDT 1,000'
                THEN jsonb_set(package, '{price}', '"$16"'::jsonb)
              ELSE package
            END
            ORDER BY ordinal
          )
          FROM jsonb_array_elements(settings."content"->'plans')
            WITH ORDINALITY AS packages(package, ordinal)
        )
      )
      WHERE settings."id" = 'site-settings'
        AND (
          settings."content"->'plans' @> '[{"id":"Premium","price":"BDT 500"}]'::jsonb
          OR settings."content"->'plans' @> '[{"id":"Free","price":"BDT 0"}]'::jsonb
          OR settings."content"->'plans' @> '[{"id":"Platinum","price":"BDT 1,000"}]'::jsonb
        )
    `);
  }
}
