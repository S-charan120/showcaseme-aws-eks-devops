output "vpc_id" {
  value = aws_vpc.main.id
}

output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "cluster_version" {
  value = aws_eks_cluster.main.version
}

output "gitlab_ci_role_arn" {
  value = aws_iam_role.gitlab_ci.arn
}

output "ecr_api_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "ecr_web_repository_url" {
  value = aws_ecr_repository.web.repository_url
}

output "s3_assets_bucket" {
  value = aws_s3_bucket.assets.bucket
}

output "database_secret_arn" {
  value     = aws_secretsmanager_secret.database.arn
  sensitive = true
}

output "jwt_secret_arn" {
  value     = aws_secretsmanager_secret.jwt.arn
  sensitive = true
}

output "database_endpoint" {
  value = aws_db_instance.main.address
}

output "app_irsa_role_arn" {
  value = aws_iam_role.app_irsa.arn
}

output "cluster_autoscaler_role_arn" {
  value = aws_iam_role.cluster_autoscaler.arn
}

output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}

output "alb_controller_role_arn" {
  value = aws_iam_role.alb_controller.arn
}
