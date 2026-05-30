import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useZodForm, z } from '@/lib/forms'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/form-demo')({
  component: FormDemoPage,
})

const profileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  bio: z.string().max(200, 'Bio must be 200 characters or less').optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

function FormDemoPage() {
  const { t } = useTranslation()

  const form = useZodForm(profileSchema, {
    defaultValues: { displayName: '', email: '', bio: '' },
  })

  function onSubmit(values: ProfileFormValues) {
    toast.success(`Profile saved: ${values.displayName}`)
    console.log(values)
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <Link
        to="/app/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        {t('common.backToDashboard')}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{t('formDemo.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('formDemo.description')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('formDemo.fields.displayName')}</FormLabel>
                <FormControl>
                  <Input placeholder="Alice" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('formDemo.fields.email')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="alice@example.com"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('formDemo.fields.emailHint')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('formDemo.fields.bio')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('formDemo.fields.bioPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t('formDemo.fields.bioHint')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t('formDemo.submit')}
          </Button>
        </form>
      </Form>
    </div>
  )
}
