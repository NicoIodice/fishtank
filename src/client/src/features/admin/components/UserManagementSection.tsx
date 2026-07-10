/**
 * User Management Section — displays user table with Create and Deactivate actions.
 * AC-1: Displays all users in alphabetical order
 * AC-2: Shows username, role, status (Active/Deactivated), Created date
 * AC-9: Create User button opens CreateUserDialog
 * AC-10: Deactivate button opens DeactivateUserDialog with last-admin guard
 */

import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUsers } from "../hooks/useUsers";
import { CreateUserDialog } from "./CreateUserDialog";
import { DeactivateUserDialog } from "./DeactivateUserDialog";
import type { User } from "../types/user";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import styles from "./UserManagementSection.module.css";

export function UserManagementSection() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading, error } = useUsers();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // AC-1: Sort users alphabetically by username
  const sortedUsers = [...users].sort((a, b) => 
    a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
  );

  function handleDeactivateClick(user: User) {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  }

  const columns: DataTableColumn<User>[] = [
    {
      key: "username",
      header: "Username",
      cell: (row) => row.username,
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => row.role,
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <span
          data-testid={`user-status-${row.username}`}
          className={`${styles.statusBadge} ${row.isActive ? `${styles.statusActive} statusActive bg-green-100 text-green-700` : `${styles.statusInactive} statusInactive bg-slate-100 text-slate-700`}`}
        >
          {row.isActive ? "Active" : "Deactivated"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row) => new Date(row.createdAt).toISOString().slice(0, 10),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => {
        const isSelf = currentUser?.username === row.username;
        if (!row.isActive || isSelf) return null;
        return (
          <button
            data-testid={`user-deactivate-${row.username}`}
            className={styles.deactivateBtn}
            onClick={() => handleDeactivateClick(row)}
          >
            Deactivate
          </button>
        );
      },
    },
  ];

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>Error loading users: {error.message}</div>
    );
  }

  return (
    <section data-testid="section-users" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>User Management</h2>
        <button
          data-testid="btn-create-user"
          className={styles.createBtn}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create User
        </button>
      </div>

      <DataTable
        rows={sortedUsers}
        columns={columns}
        getRowId={(row) => row.id}
        getRowTestId={(row) => `user-row-${row.username}`}
        getRowClassName={(row) => (!row.isActive ? `${styles.deactivatedRow} deactivatedRow` : "")}
        data-testid="table-users"
      />

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedUser && (
        <DeactivateUserDialog
          open={deactivateDialogOpen}
          onOpenChange={setDeactivateDialogOpen}
          user={selectedUser}
        />
      )}
    </section>
  );
}
