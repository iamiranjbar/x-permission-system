import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndicesForPerformance1734601367989 implements MigrationInterface {
    name = 'AddIndicesForPerformance1734601367989'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_memberships" DROP CONSTRAINT "FK_a434c0d46f4b97696924ecdd176"`);
        await queryRunner.query(`ALTER TABLE "group_memberships" ALTER COLUMN "groupId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_a6445c07a93e2ca9c0babdf24b" ON "permissions" ("permittedId", "permissionType", "tweetId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_d952eb98ad4d47fd4e38de9730" ON "tweets" ("parentTweetId", "inheritViewPermissions", "inheritEditPermissions") `);
        await queryRunner.query(`CREATE INDEX "IDX_ea060bbfd64188b95b5a178296" ON "group_memberships" ("memberId", "groupId") `);
        await queryRunner.query(`ALTER TABLE "group_memberships" ADD CONSTRAINT "FK_a434c0d46f4b97696924ecdd176" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_memberships" DROP CONSTRAINT "FK_a434c0d46f4b97696924ecdd176"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea060bbfd64188b95b5a178296"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d952eb98ad4d47fd4e38de9730"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a6445c07a93e2ca9c0babdf24b"`);
        await queryRunner.query(`ALTER TABLE "group_memberships" ALTER COLUMN "groupId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "group_memberships" ADD CONSTRAINT "FK_a434c0d46f4b97696924ecdd176" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
