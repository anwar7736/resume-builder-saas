import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertDollarPackagePricesToBdt1740000000000 implements MigrationInterface {
  name = "ConvertDollarPackagePricesToBdt1740000000000";

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`
      UPDATE "app_settings" AS settings
      SET "content" = jsonb_set(
        settings."content",
        '{plans}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN package->>'id' = 'Premium' AND package->>'price' = '$5'
                THEN jsonb_set(package, '{price}', '"BDT 500"'::jsonb)
              WHEN package->>'id' = 'Platinum' AND package->>'price' = '$10'
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
          settings."content"->'plans' @> '[{"id":"Premium","price":"$5"}]'::jsonb
          OR settings."content"->'plans' @> '[{"id":"Platinum","price":"$10"}]'::jsonb
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
              WHEN package->>'id' = 'Premium' AND package->>'price' = 'BDT 500'
                THEN jsonb_set(package, '{price}', '"$5"'::jsonb)
              WHEN package->>'id' = 'Platinum' AND package->>'price' = 'BDT 1,000'
                THEN jsonb_set(package, '{price}', '"$10"'::jsonb)
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
          OR settings."content"->'plans' @> '[{"id":"Platinum","price":"BDT 1,000"}]'::jsonb
        )
    `);
  }
}
