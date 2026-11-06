# Security controls

## AWS identity and access
- GitLab CI exchanges a short-lived OIDC ID token for an AWS role restricted to the configured project path and default branch.
- EKS workload identity uses IRSA. The API's service account can access only objects under `portfolio-assets/*` in its S3 bucket.
- Cluster Autoscaler and AWS Load Balancer Controller have separate service accounts and scoped IAM roles.
- No AWS access key is stored in GitLab variables or source control.

## Network and data
- EKS worker nodes and RDS are placed in private subnets. Public ingress is through an AWS Load Balancer Controller-managed ALB.
- RDS is encrypted at rest and not publicly accessible; its security group accepts PostgreSQL only from the EKS cluster security group.
- The assets bucket blocks public ACLs and policies, uses server-side encryption and versioning.
- Store `DATABASE_URL` and `JWT_SECRET` in a Kubernetes Secret created from secure operator input. Do not commit generated credentials or Terraform state.

## Kubernetes
- API and web containers run without privilege escalation and drop Linux capabilities.
- Readiness, startup and liveness probes are configured separately.
- CPU requests/limits and HPA are defined in Helm.
- An explicit namespace-scoped observer Role/RoleBinding demonstrates least-privilege Kubernetes RBAC; it does not grant cluster-admin.
- Keep Argo CD and GitLab project access restricted; enable protected branches and protected/masked CI variables.
