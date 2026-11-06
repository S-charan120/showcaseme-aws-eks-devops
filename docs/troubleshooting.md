# Troubleshooting runbook

| Symptom | Checks | Likely action |
|---|---|---|
| Pods stuck in ImagePullBackOff | `kubectl describe pod`, ECR image URI/tag, node IAM pull policy, ECR repository region | Check the image tag exists and node role has ECR read access |
| API CrashLoopBackOff | `kubectl logs deploy/showcaseme-api`, `kubectl describe pod`, Kubernetes Secret keys | Verify `DATABASE_URL`, `JWT_SECRET`, RDS SG and migration logs |
| API readiness fails | `kubectl logs`, `kubectl exec` only when appropriate, RDS endpoint and port 5432 | Confirm DB URL, private subnets, route tables, RDS status and SG source |
| S3 upload URL returns 503 | `S3_BUCKET` env, bucket value, API logs | Set the correct bucket name and roll out the API |
| S3 upload fails with AccessDenied | `kubectl describe sa showcaseme-api`, projected AWS identity, IAM role policy | Check IRSA annotation, OIDC trust subject and object prefix permissions |
| Ingress has no ALB address | `kubectl describe ingress`, controller logs, public subnet tags | Check ALB controller role, subnet tags, VPC ID, region and controller service account |
| HPA shows unknown metrics | `kubectl get apiservice v1beta1.metrics.k8s.io`, metrics-server logs | Install metrics-server and confirm node/pod resource metrics are available |
| Pending pods cannot trigger node scale-out | Cluster Autoscaler logs, ASG discovery tags, IAM role, node group min/max | Check ASG discovery tags, IRSA and node group bounds |
| GitOps image not updated | GitLab pipeline, ECR SHA tag, GitLab commit to values file, Argo app status | Confirm pipeline token write access and Argo is watching the intended branch/path |
| Argo CD OutOfSync | Argo diff, chart render, Git commit history | Fix the source values/manifests; avoid manual kubectl edits that GitOps will revert |

Useful commands:
```bash
kubectl get nodes -o wide
kubectl get pods -A
kubectl get deploy,svc,hpa,ingress -n showcaseme
kubectl describe hpa -n showcaseme
kubectl logs -n kube-system deploy/cluster-autoscaler --tail=100
kubectl logs -n kube-system deploy/aws-load-balancer-controller --tail=100
kubectl get applications -n argocd
```
