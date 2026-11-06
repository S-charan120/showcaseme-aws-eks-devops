variable "aws_region" {
  description = "AWS region for the platform."
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  type    = string
  default = "showcaseme"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "cluster_version" {
  description = "EKS Kubernetes version. 1.36 is currently in standard support as of November 2026."
  type        = string
  default     = "1.36"
}

variable "vpc_cidr" {
  type    = string
  default = "10.60.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.60.0.0/24", "10.60.1.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.60.10.0/24", "10.60.11.0/24"]
}

variable "cluster_admin_cidrs" {
  description = "Public IPv4 CIDR ranges allowed to reach the EKS Kubernetes API. Replace the safe loopback default with your own public IP /32 before applying."
  type        = list(string)
  default     = ["127.0.0.1/32"]
}

variable "node_instance_types" {
  type    = list(string)
  default = ["t3.medium"]
}

variable "node_min_size" {
  type    = number
  default = 1
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 3
}

variable "db_instance_class" {
  description = "Choose a supported class for the selected region; small classes are for learning only."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  type    = string
  default = "showcaseme"
}

variable "db_username" {
  type    = string
  default = "showcaseme_admin"
}

variable "db_backup_retention_days" {
  type    = number
  default = 1
}

variable "tags" {
  type    = map(string)
  default = {}
}
