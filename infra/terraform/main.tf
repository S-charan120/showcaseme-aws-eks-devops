data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

locals {
  name            = "${var.project_name}-${var.environment}"
  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  eks_oidc_issuer = aws_eks_cluster.main.identity[0].oidc[0].issuer
  eks_oidc_host   = replace(local.eks_oidc_issuer, "https://", "")
}

