import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaseEntitiesCreation1734464982901 implements MigrationInterface {
  name = 'BaseEntitiesCreation1734464982901'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TYPE "public"."tweets_category_enum" AS ENUM('Sport', 'Finance', 'Tech', 'News')`);
    await queryRunner.query(`CREATE TABLE "tweets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "content" text NOT NULL, "hashtags" text array, "category" "public"."tweets_category_enum", "location" character varying(255), "inheritViewPermissions" boolean NOT NULL DEFAULT true, "inheritEditPermissions" boolean NOT NULL DEFAULT true, "authorId" uuid NOT NULL, "parentTweetId" uuid, CONSTRAINT "PK_19d841599ad812c558807aec76c" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TYPE "public"."permissions_permittedentitytype_enum" AS ENUM('User', 'Group')`);
    await queryRunner.query(`CREATE TYPE "public"."permissions_permissiontype_enum" AS ENUM('View', 'Edit')`);
    await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "permittedId" uuid NOT NULL, "permittedEntityType" "public"."permissions_permittedentitytype_enum" NOT NULL, "permissionType" "public"."permissions_permissiontype_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "tweetId" uuid NOT NULL, CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "group_memberships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "memberId" uuid NOT NULL, "memberType" character varying(50) NOT NULL, "groupId" uuid, CONSTRAINT "PK_4a04ebe9f25ad41f45b2c0ca4b5" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_664ea405ae2a10c264d582ee563" UNIQUE ("name"), CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "tweets" ADD CONSTRAINT "FK_2da2b52386c1c0ad64bf191aa47" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "tweets" ADD CONSTRAINT "FK_7f22ed3870e50ea16b8490af8f8" FOREIGN KEY ("parentTweetId") REFERENCES "tweets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "permissions" ADD CONSTRAINT "FK_124fb76aea7fe9512068224637e" FOREIGN KEY ("tweetId") REFERENCES "tweets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "group_memberships" ADD CONSTRAINT "FK_a434c0d46f4b97696924ecdd176" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "group_memberships" DROP CONSTRAINT "FK_a434c0d46f4b97696924ecdd176"`);
    await queryRunner.query(`ALTER TABLE "permissions" DROP CONSTRAINT "FK_124fb76aea7fe9512068224637e"`);
    await queryRunner.query(`ALTER TABLE "tweets" DROP CONSTRAINT "FK_7f22ed3870e50ea16b8490af8f8"`);
    await queryRunner.query(`ALTER TABLE "tweets" DROP CONSTRAINT "FK_2da2b52386c1c0ad64bf191aa47"`);
    await queryRunner.query(`DROP TABLE "groups"`);
    await queryRunner.query(`DROP TABLE "group_memberships"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TYPE "public"."permissions_permissiontype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."permissions_permittedentitytype_enum"`);
    await queryRunner.query(`DROP TABLE "tweets"`);
    await queryRunner.query(`DROP TYPE "public"."tweets_category_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }

}
