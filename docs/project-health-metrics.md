# Project health metrics

Project health is calculated in PostgreSQL and stored on `projects`. The frontend only displays the persisted result.

## Baseline

The latest approved estimate is the project baseline. Baseline hours are the sum of its active work packages. If no approved estimate exists, `projects.estimated_hours` is used as a fallback.

Approving a new estimate version changes the baseline. Previous versions remain available as the scope-change history. Draft estimates never affect project health.

## Progress

For projects with estimates enabled:

```text
progress = estimated hours of completed tasks / baseline hours * 100
```

The denominator is the approved baseline, not the sum of tasks currently created. Work that has not yet been decomposed into tasks therefore remains incomplete.

For projects without estimates:

```text
progress = completed task count / total task count * 100
```

Completed task statuses are `done`, `completed`, `complete`, and `closed`. Completed projects always report 100% progress.

## Resource consumption

Actual hours are calculated from all project time entries:

```text
hours used = actual hours / baseline hours * 100
hours variance = hours used - progress
```

A positive variance means resources are being consumed faster than scope is being completed.

When progress is at least 10%, the forecast is:

```text
forecast at completion = hours used / progress * 100
```

The forecast is suppressed below 10% progress because early values are unstable.

## Schedule and delivery

Expected progress is the percentage of working days elapsed between the project start and end dates. Weekends are excluded.

Incomplete overdue tasks produce at least Yellow risk. An overdue task with an unresolved blocker, or a project past its end date with incomplete scope, produces Red risk.

## Risk thresholds

The project receives the worst applicable status:

| Signal | Green | Yellow | Red |
| --- | ---: | ---: | ---: |
| Hours ahead of progress | <= 10 pp | > 10 pp | > 20 pp |
| Progress behind schedule | <= 10 pp | > 10 pp | > 20 pp |
| Forecast at completion | <= 105% | > 105% | > 115% |

Projects without baseline hours have `unknown` risk. `risk_reason` contains the highest-priority reason shown in the project overview.

## Monetary budget limitation

`estimates.price_per_hour` is a commercial customer rate, not an employee cost rate. It can calculate the approved commercial budget, but it cannot represent actual internal spend.

Until internal cost rates and external expenses are modeled, the risk calculation uses hours as the resource budget. The UI labels this metric `Hours used` and keeps `Commercial budget` separate. This avoids presenting invoiced value as company cost.