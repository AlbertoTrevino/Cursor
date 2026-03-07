-- CreateTable
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'simple',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "claude_response" TEXT,
    "gpt_response" TEXT,
    "merged_response" TEXT,
    "handoff_text" TEXT,
    "recommendation" TEXT,
    "recommend_reason" TEXT,
    "project_context" TEXT,
    "affected_areas" TEXT,
    "structural_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_attachments" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_diagrams" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Diagram',
    "diagram_data" JSONB,
    "image_data" TEXT,
    "storage_path" TEXT,
    "source_type" TEXT NOT NULL DEFAULT 'excalidraw',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idea_diagrams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_clarifications" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_clarifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fabric_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fabric_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ideas_user_id_idx" ON "ideas"("user_id");

-- CreateIndex
CREATE INDEX "idea_attachments_idea_id_idx" ON "idea_attachments"("idea_id");

-- CreateIndex
CREATE INDEX "idea_diagrams_idea_id_idx" ON "idea_diagrams"("idea_id");

-- CreateIndex
CREATE INDEX "idea_clarifications_idea_id_idx" ON "idea_clarifications"("idea_id");

-- CreateIndex
CREATE INDEX "fabric_connections_user_id_idx" ON "fabric_connections"("user_id");

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_attachments" ADD CONSTRAINT "idea_attachments_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_diagrams" ADD CONSTRAINT "idea_diagrams_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_clarifications" ADD CONSTRAINT "idea_clarifications_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fabric_connections" ADD CONSTRAINT "fabric_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
