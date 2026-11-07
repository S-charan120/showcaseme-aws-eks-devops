# Implementation status

Last reviewed: 2026-11-07 · CI lockfile policy aligned

## AWS v14 resume-alignment matrix

| Resume requirement | Repository evidence | Status |
|---|---|---|
| React.js + Node.js portfolio application | React UI, Express API, JWT auth, PostgreSQL persistence, public portfolio workflows | API tests/syntax and frontend build passed in GitHub Actions |
| Amazon EKS | Terraform cluster and managed node group | Terraform format/init/validate passed; no AWS apply yet |
| Amazon ECR | Two immutable image repositories with scan on push | Terraform validates; no images pushed to a real AWS account |
| Amazon RDS | Private encrypted PostgreSQL, generated secret and private SG | Terraform validates; database not provisioned |
| Amazon S3 | Private encrypted versioned bucket with Block Public Access | Terraform validates; bucket not provisioned |
| VPC / IAM | VPC/subnets/routing, cluster/node roles, OIDC and scoped app/controller roles | Terraform validates; IAM not applied |
| Terraform | EKS, VPC, RDS, S3, IAM, ECR and generated secrets | `fmt`, `init -backend=false` and `validate` passed |
| Helm | API/web deployments and services, probes, requests/limits, HPA, Ingress, PDB and RBAC | `helm lint` and default/AWS template rendering passed |
| GitLab CI | API/web validation, Terraform/Helm validation, image build, ECR push and GitOps promotion | Pipeline source present; not run because GitLab project/OIDC variables are not connected |
| Argo CD | Application, metrics-server and Cluster Autoscaler application manifests | Manifests present; Argo CD not installed or synced |
| Kubernetes RBAC | Namespace-scoped observer Role/RoleBinding | Helm manifest validated; not applied to EKS |
| IRSA | API S3, Load Balancer Controller and Cluster Autoscaler roles | Terraform validates; runtime IAM not applied/tested |
| Node group autoscaling | ASG discovery tags, Cluster Autoscaler role and Argo application | Configuration reviewed |
| 12-to-8-minute release improvement | No comparable live release timing captured | Not verified; do not report as measured evidence yet |

## Verified GitHub Actions evidence

The latest fully successful validation run:
- API dependencies installed from committed lockfile; tests and syntax checks passed.
- React dependencies installed from committed lockfile; production build passed.
- API and web Docker images built.
- Terraform formatting, initialization (without AWS backend) and validation passed.
- Helm lint and both default/AWS values renders passed.
- npm lockfiles and Terraform provider lockfile are committed. GitLab and GitHub validation use reproducible `npm ci`; workflows do not auto-commit dependency or Terraform lock changes.


## Remaining external completion gates
1. Create/import the GitLab project at the exact path set in Terraform (or change `gitlab_project_path`) and configure the GitLab CI variables described in `deploy/README.md`.
2. Provide an AWS sandbox account/role or run the documented Terraform apply in your account after reviewing cost, IAM and API CIDR.
3. Install Argo CD and AWS Load Balancer Controller; configure chart placeholders/role ARNs; sync apps.
4. Verify EKS pods, HPA, Cluster Autoscaler, RDS private connectivity, S3 presigned upload and IRSA policy boundaries.
5. Record comparable release durations before stating the 12-to-8-minute improvement.

