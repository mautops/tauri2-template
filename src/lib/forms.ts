import { zodResolver } from '@hookform/resolvers/zod'
import { type DefaultValues, type UseFormProps, useForm } from 'react-hook-form'
import { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZodObject = z.ZodType<any, any, any>

export function useZodForm<TSchema extends AnyZodObject>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'> & {
    defaultValues?: DefaultValues<z.infer<TSchema>>
  },
) {
  return useForm<z.infer<TSchema>>({
    // zodResolver v5 has overloaded signatures for both zod v3 and v4 schemas.
    // The generic constraints don't align perfectly with zod v4's TypeScript types,
    // but the runtime behavior is correct.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    ...options,
  })
}

export { z } from 'zod'
