import * as React from "react"
import { Check, X, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

function FeatureItem({ feature }) {
  const Icon = feature.isIncluded ? Check : X

  return (
    <li className="pricing-card__feature">
      <Icon
        className={cn("pricing-card__feature-icon", feature.isIncluded ? "is-included" : "is-muted")}
        aria-hidden="true"
      />
      <span className={feature.isIncluded ? "" : "is-muted"}>{feature.name}</span>
    </li>
  )
}

function formatPlanPrice(value, locale = "pt-BR", currency = "BRL") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

/**
 * Builds the ordered list of unique feature names from all plans,
 * preserving the order from the first plan that introduces each name.
 */
function buildAllFeatures(plans) {
  const seen = new Set()
  const result = []
  for (const plan of plans) {
    for (const f of plan.features) {
      if (!seen.has(f.name)) {
        seen.add(f.name)
        result.push({ name: f.name, category: f.category ?? null })
      }
    }
  }
  return result
}

function PricingCard({
  plans,
  billingCycle,
  onCycleChange,
  onPlanSelect,
  className,
  title = "Escolha o plano ideal para sua rotina.",
  description = "Compare acompanhamento, tokens e recursos antes de finalizar a assinatura.",
  locale = "pt-BR",
  currency = "BRL",
  ...props
}) {
  if (!Array.isArray(plans) || plans.length !== 3) {
    console.error("PricingCard requires exactly 3 pricing tiers.")
    return null
  }

  const allFeatures = buildAllFeatures(plans)

  // Detect if we have category data to render grouped sections
  const hasCategories = allFeatures.some((f) => f.category)
  const categories = hasCategories
    ? Array.from(new Set(allFeatures.map((f) => f.category).filter(Boolean)))
    : []

  return (
    <div className={cn("pricing-card", className)} {...props}>
      {title || description ? (
        <header className="pricing-card__header">
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </header>
      ) : null}

      <div className="pricing-card__cycle">
        <ToggleGroup
          type="single"
          value={billingCycle}
          onValueChange={(value) => {
            if (value === "monthly" || value === "annually") {
              onCycleChange(value)
            }
          }}
          aria-label="Selecionar ciclo de cobranca"
          className="pricing-card__toggle"
        >
          <ToggleGroupItem
            value="monthly"
            aria-label="Cobranca mensal"
            className="pricing-card__toggle-item"
          >
            Mensal
          </ToggleGroupItem>
          <ToggleGroupItem
            value="annually"
            aria-label="Cobranca anual"
            className="pricing-card__toggle-item"
          >
            Anual
            <span className="pricing-card__discount">
              -20%
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <section aria-label="Planos de assinatura" className="pricing-card__plans">
        {plans.map((plan) => {
          const isFeatured = plan.isPopular
          const currentPrice = billingCycle === "monthly" ? plan.priceMonthly : plan.priceAnnually
          const suffix = billingCycle === "monthly" ? "/mes" : "/ano"
          // Use highlights for the card if provided, otherwise fall back to first 6 features
          const cardItems = plan.highlights ?? plan.features.slice(0, 6)

          return (
            <Card
              key={plan.id}
              className={cn(
                "pricing-card__plan",
                isFeatured && "is-featured"
              )}
            >
              <CardHeader className="pricing-card__plan-header">
                <div className="pricing-card__plan-heading">
                  <div>
                    <CardTitle className="pricing-card__plan-title">{plan.name}</CardTitle>
                    <CardDescription className="pricing-card__plan-description">{plan.description}</CardDescription>
                  </div>
                  {isFeatured ? (
                    <span className="pricing-card__popular">
                      Popular
                    </span>
                  ) : null}
                </div>

                <div className="pricing-card__price">
                  <p>
                    {formatPlanPrice(currentPrice, locale, currency)}
                    <span>{suffix}</span>
                  </p>
                  {billingCycle === "annually" ? (
                    <small>
                      Equivale a {formatPlanPrice(currentPrice / 12, locale, currency)}/mes
                    </small>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="pricing-card__plan-content">
                <h3>Inclui:</h3>
                <ul>
                  {cardItems.map((feature) => (
                    <FeatureItem key={feature.name} feature={feature} />
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pricing-card__plan-footer">
                <Button
                  type="button"
                  size="lg"
                  variant={isFeatured ? "default" : "outline"}
                  className="pricing-card__button"
                  onClick={() => onPlanSelect(plan.id, billingCycle)}
                  aria-label={`Escolher plano ${plan.name} no ciclo ${billingCycle === "monthly" ? "mensal" : "anual"}`}
                >
                  {plan.buttonLabel}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </section>

      <section aria-label="Comparativo de recursos" className="pricing-card__comparison">
        <h3>Comparativo detalhado</h3>
        <div className="pricing-card__table-shell">
          <table>
            <thead>
              <tr>
                <th>Recurso</th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className={plan.isPopular ? "is-featured" : ""}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasCategories
                ? categories.flatMap((cat) => {
                    const catFeatures = allFeatures.filter((f) => f.category === cat)
                    return [
                      // Category header row
                      <tr key={`cat-${cat}`} className="pricing-card__category-row">
                        <td colSpan={plans.length + 1}>{cat}</td>
                      </tr>,
                      // Feature rows for this category
                      ...catFeatures.map((feature, idx) => (
                        <tr key={feature.name} className={idx % 2 === 0 ? "is-even" : ""}>
                          <td>{feature.name}</td>
                          {plans.map((plan) => {
                            const f = plan.features.find((item) => item.name === feature.name)
                            // Value cell (text display)
                            if (f?.value) {
                              return (
                                <td
                                  key={`${plan.id}-${feature.name}`}
                                  className={cn("pricing-card__table-value-cell", plan.isPopular ? "is-featured" : "")}
                                >
                                  <span className="pricing-card__table-value">{f.value}</span>
                                </td>
                              )
                            }
                            // Boolean cell (✓ / ✗)
                            const isIncluded = f?.isIncluded ?? false
                            const Icon = isIncluded ? Check : Minus
                            return (
                              <td
                                key={`${plan.id}-${feature.name}`}
                                className={plan.isPopular ? "is-featured" : ""}
                              >
                                <Icon
                                  className={cn(
                                    "pricing-card__table-icon",
                                    isIncluded ? "is-included" : "is-muted"
                                  )}
                                  aria-label={isIncluded ? "Incluido" : "Nao incluido"}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )),
                    ]
                  })
                : // Flat rendering (no categories)
                  allFeatures.map((feature, index) => (
                    <tr key={feature.name} className={index % 2 === 0 ? "is-even" : ""}>
                      <td>{feature.name}</td>
                      {plans.map((plan) => {
                        const f = plan.features.find((item) => item.name === feature.name)
                        if (f?.value) {
                          return (
                            <td
                              key={`${plan.id}-${feature.name}`}
                              className={cn("pricing-card__table-value-cell", plan.isPopular ? "is-featured" : "")}
                            >
                              <span className="pricing-card__table-value">{f.value}</span>
                            </td>
                          )
                        }
                        const isIncluded = f?.isIncluded ?? false
                        const Icon = isIncluded ? Check : Minus
                        return (
                          <td
                            key={`${plan.id}-${feature.name}`}
                            className={plan.isPopular ? "is-featured" : ""}
                          >
                            <Icon
                              className={cn(
                                "pricing-card__table-icon",
                                isIncluded ? "is-included" : "is-muted"
                              )}
                              aria-label={isIncluded ? "Incluido" : "Nao incluido"}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default PricingCard
export { PricingCard }
