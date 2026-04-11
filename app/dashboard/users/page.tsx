'use client'

import PageHeader from '@/components/dashboard/page-header'
import { users } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, UserPlus } from 'lucide-react'

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Foydalanuvchilar"
        description="Tizim foydalanuvchilarini boshqarish va ularning ruxsatlarini o'rnatish"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Foydalanuvchilar' },
        ]}
        actions={
          <Button size="sm" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Yangi foydalanuvchi
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Users Table */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Faol foydalanuvchilar</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Ism</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Rol</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{user.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{user.role}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-success/10 text-success">
                        ● {user.status === 'active' ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-critical hover:text-critical/80">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Roles Info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Roller va ruxsatlar</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">Admin</h3>
              <p className="text-sm text-muted-foreground">
                Tizimning barcha funksiyalariga kirish huquqiga ega. Foydalanuvchilarni boshqarish va sozlamalari o'zgartirishni amalga oshirish mumkin.
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">Manager</h3>
              <p className="text-sm text-muted-foreground">
                Ishlab chiqarish bo'limlarini boshqarish va hisobotlarni ko'rish huquqiga ega. Tizim sozlamalarini o'zgartirib bo'lmaydi.
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">Inspector</h3>
              <p className="text-sm text-muted-foreground">
                Sifat tekshirish va defektlarni ro'yxatlash uchun foydalaniladi. Tizimni boshqarish huquqiga ega emas.
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground mb-2">Lead</h3>
              <p className="text-sm text-muted-foreground">
                Shift mudiri. O'z shiftining ko'rsatkichlarini ko'rish va hisobotlar yaratish uchun foydalaniladi.
              </p>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">So'ngi faoliyat</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-border">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-foreground"><span className="font-semibold">Admin User</span> tizimga kirdi</p>
                <p className="text-xs text-muted-foreground">30 minut oldin</p>
              </div>
            </div>
            <div className="flex items-start gap-4 pb-4 border-b border-border">
              <div className="w-2 h-2 rounded-full bg-success mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-foreground"><span className="font-semibold">QC Inspector</span> yangi defekt ro'yxatladi</p>
                <p className="text-xs text-muted-foreground">2 soat oldin</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-warning mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-foreground"><span className="font-semibold">Workshop Manager</span> hisobot yaratdi</p>
                <p className="text-xs text-muted-foreground">3 soat oldin</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
