# AWS cost controls

EKS control plane, EC2 worker nodes, RDS, NAT Gateway, ALB and data transfer may charge continuously. Before applying Terraform:

1. Use a dedicated sandbox account and billing alerts/budget.
2. Review `terraform plan` and resource sizes/region.
3. Keep node count and RDS class minimal for learning; do not assume free tier.
4. Avoid leaving clusters, NAT gateways, load balancers or databases running.
5. Snapshot/export data only when required; destroy ephemeral environments and verify resources are gone.
