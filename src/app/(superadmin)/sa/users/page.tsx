import { createClient } from "@/lib/supabase/server";
import { 
  Users, 
  Search,
  Mail,
  Calendar,
  Filter
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserActionsDropdown } from "@/components/superadmin/user-actions-dropdown";
import { CreateUserDialog } from "@/components/superadmin/create-user-dialog";

export default async function UsersPage() {
  const supabase = await createClient();

  // Get current user for self-detection
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'superadmin':
        return <Badge className="bg-purple-500 hover:bg-purple-600">SuperAdmin</Badge>;
      case 'support':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Soporte</Badge>;
      default:
        return <Badge variant="secondary">Usuario</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">Usuarios de Plataforma</h1>
          <p className="text-muted-foreground">Gestiona los accesos y roles de todos los usuarios.</p>
        </div>
        <CreateUserDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-[var(--line)] shadow-[var(--shadow-stamp)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-[var(--accent)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--line)] shadow-[var(--shadow-stamp)] overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o email..." className="pl-9 bg-background" />
          </div>
          <Button variant="outline" size="sm">
             <Filter className="mr-2 h-4 w-4" />
             Filtros
          </Button>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Usuario</TableHead>
                <TableHead>Rol de Plataforma</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id} className="group hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarImage src={profile.avatar_url || ''} />
                        <AvatarFallback className="bg-orange-100 text-orange-700">
                          {profile.display_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold">{profile.display_name || 'Sin nombre'}</span>
                        <span className="text-xs text-muted-foreground font-mono">{profile.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(profile.platform_role)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="size-3" />
                      {profile.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-3" />
                      {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActionsDropdown
                      userId={profile.id}
                      currentRole={profile.platform_role}
                      displayName={profile.display_name}
                      isSelf={profile.id === user?.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
