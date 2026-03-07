-- AlterTable: Rename imageData to imagePath in idea_diagrams
ALTER TABLE "idea_diagrams" RENAME COLUMN "image_data" TO "image_path";

-- CreateTable
CREATE TABLE IF NOT EXISTS "idea_versions" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "claude_response" TEXT,
    "gpt_response" TEXT,
    "merged_response" TEXT,
    "handoff_text" TEXT,
    "recommendation" TEXT,
    "recommend_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "idea_versions_idea_id_version_key" ON "idea_versions"("idea_id", "version");
CREATE INDEX IF NOT EXISTS "idea_versions_idea_id_idx" ON "idea_versions"("idea_id");

-- AddForeignKey
ALTER TABLE "idea_versions" ADD CONSTRAINT "idea_versions_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add encrypted secret fields to fabric_connections
ALTER TABLE "fabric_connections" ADD COLUMN IF NOT EXISTS "encrypted_secret" TEXT;
ALTER TABLE "fabric_connections" ADD COLUMN IF NOT EXISTS "secret_iv" TEXT;
ALTER TABLE "fabric_connections" ADD COLUMN IF NOT EXISTS "secret_auth_tag" TEXT;
