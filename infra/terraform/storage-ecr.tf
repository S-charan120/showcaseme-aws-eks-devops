# Immutable ECR repositories and private, encrypted, versioned S3 assets bucket.
# -------------------- ECR image repositories --------------------
resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}-api"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

resource "aws_ecr_repository" "web" {
  name                 = "${var.project_name}-web"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({ rules = [{
    rulePriority = 1
    description  = "Retain the newest 25 immutable commit images"
    selection = {
      tagStatus     = "tagged"
      tagPrefixList = ["sha-"]
      countType     = "imageCountMoreThan"
      countNumber   = 25
    }
    action = { type = "expire" }
  }] })
}

resource "aws_ecr_lifecycle_policy" "web" {
  repository = aws_ecr_repository.web.name
  policy     = aws_ecr_lifecycle_policy.api.policy
}

# -------------------- Private S3 assets bucket --------------------
resource "aws_s3_bucket" "assets" {
  bucket_prefix = "${var.project_name}-${var.environment}-${data.aws_caller_identity.current.account_id}-"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

