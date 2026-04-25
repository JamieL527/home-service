'use client'

import { PASSWORD_RULES } from '@/lib/validations/password'

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
          >
            <span className="w-3 shrink-0 text-center">{met ? '✓' : '○'}</span>
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
