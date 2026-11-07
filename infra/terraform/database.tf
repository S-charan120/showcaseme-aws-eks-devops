# Private, encrypted PostgreSQL RDS and runtime secret material.
# -------------------- Database: encrypted PostgreSQL in private subnets --------------------
resource "aws_security_group" "rds" {
  name        = "${local.name}-rds-sg"
  description = "PostgreSQL reachable only from the EKS cluster security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EKS managed nodes (cluster security group)"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name}-db-subnets" }
}

resource "random_password" "db" {
  length           = 28
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

resource "aws_db_instance" "main" {
  identifier                      = "${local.name}-postgres"
  engine                          = "postgres"
  instance_class                  = var.db_instance_class
  allocated_storage               = 20
  max_allocated_storage           = 50
  storage_type                    = "gp3"
  storage_encrypted               = true
  db_name                         = var.db_name
  username                        = var.db_username
  password                        = random_password.db.result
  port                            = 5432
  db_subnet_group_name            = aws_db_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.rds.id]
  publicly_accessible             = false
  multi_az                        = false
  backup_retention_period         = var.db_backup_retention_days
  auto_minor_version_upgrade      = true
  deletion_protection             = false
  skip_final_snapshot             = true
  apply_immediately               = false
  enabled_cloudwatch_logs_exports = ["postgresql"]
  tags                            = { Name = "${local.name}-postgres" }
}

resource "aws_secretsmanager_secret" "database" {
  name                    = "${local.name}/database"
  description             = "ShowcaseMe database connection information; restrict read access."
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    host         = aws_db_instance.main.address
    port         = aws_db_instance.main.port
    database     = var.db_name
    username     = var.db_username
    password     = random_password.db.result
    database_url = "postgresql://${urlencode(var.db_username)}:${urlencode(random_password.db.result)}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.db_name}"
  })
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${local.name}/jwt-secret"
  description             = "ShowcaseMe API JWT signing secret."
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = random_password.jwt.result
}

