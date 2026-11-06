# AWS cost controls

This architecture is intentionally realistic, not free-tier-only. Do not deploy it in an account without a budget and alerting.

## Resources that can incur ongoing charges
- EKS cluster control plane.
- EC2 worker nodes in the managed node group.
- One NAT Gateway and its data processing/transfer.
- RDS PostgreSQL instance, provisioned storage and backup retention.
- Application Load Balancer after Ingress creation.
- ECR storage, CloudWatch/EKS control-plane logs if enabled, S3 storage/requests and data transfer.

## Cost-safe workflow
1. Create an AWS Budget and billing alerts before Terraform apply.
2. Use a dedicated learning account and the smallest compatible instance classes.
3. Apply only after reviewing the saved Terraform plan.
4. Keep node group min/desired/max conservative; Cluster Autoscaler can scale to zero only if explicitly configured (this project keeps at least one node).
5. Do not leave the EKS cluster, NAT Gateway, RDS instance or ALB running when not learning/deploying.
6. Back up any needed database data, then review and apply `terraform plan -destroy`.
7. Verify the EKS cluster, DB, NAT Gateway, EIP, ALB, EC2 instances and snapshots are removed.

Exact charges depend on region, hours, instance size, traffic and current AWS pricing. This repository does not hard-code price estimates.
