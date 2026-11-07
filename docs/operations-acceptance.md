# ShowcaseMe operations and acceptance guide

## 1. Preflight

- [ ] Terraform backend is remote, encrypted, versioned and locked.
- [ ] Terraform fmt/init/validate and a reviewed plan pass.
- [ ] GitLab OIDC role trust is scoped to intended project/ref/audience.
- [ ] ECR repositories and immutable commit-SHA image tags are configured.
- [ ] EKS cluster access, managed node group and autoscaler permissions are verified.
- [ ] RDS is private; credentials are stored securely; app security group is narrowly scoped.
- [ ] S3 Block Public Access and encryption are enabled; IRSA policy is bucket/object scoped.
- [ ] Helm chart renders with AWS values; RBAC and service-account annotations are reviewed.
- [ ] Argo CD source path, destination namespace and sync policy are confirmed.
- [ ] GitLab push token is masked/protected and has only required repository permissions.

## 2. Deployment order

1. Apply Terraform foundation and confirm VPC, EKS, node groups, RDS, S3 and IAM outputs.
2. Configure cluster access and install/verify ingress, metrics and autoscaling components.
3. Install Argo CD and register the GitOps source. Confirm the GitLab repository is accessible to Argo CD (public read or configured credentials) and its branch/path match the Application manifest.
4. Run GitLab validation pipeline; confirm tests, Terraform validation, Helm lint/render and Docker builds pass.
5. Configure GitLab OIDC variables; verify `aws sts get-caller-identity` resolves intended role.
6. Publish API/web SHA images to ECR; verify digests.
7. Promote image tags to Git-managed Helm values; inspect commit diff.
8. Confirm Argo CD observes the commit and syncs; inspect Kubernetes rollout and ingress.
9. Run application smoke tests and verify RDS/S3 access using workload identity.

## 3. Release acceptance

- GitLab pipeline passed and release commit is traceable.
- ECR contains both expected SHA-tagged images.
- GitOps values reference those exact tags.
- Argo CD reports intended revision and healthy/synced application.
- Deployments have available replicas; HPA metrics are available.
- Ingress returns expected responses; API readiness and core portfolio lifecycle pass.
- RDS connectivity and scoped S3 operations succeed; no static AWS keys are present in pods.
- Logs and Kubernetes events show no unresolved startup, probe or permission errors.

## 4. GitOps rollback

1. Revert the promotion commit in GitOps source (don't edit live resources as durable fix).
2. Confirm Argo CD detects previous desired revision and synchronizes it.
3. Wait for deployment rollout; verify ingress, readiness, RDS and S3 access.
4. Record bad/restored revisions and follow-up action.

## 5. Teardown and cost

EKS control plane, EC2 nodes, RDS, NAT, ALB and storage can continue billing. For a lab, preserve evidence and data first, then destroy Terraform-managed resources using a reviewed plan. Remove leftover load balancers, volumes, snapshots and log groups only when safe.
