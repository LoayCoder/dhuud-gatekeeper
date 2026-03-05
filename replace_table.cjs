const fs = require('fs');
const file = 'src/pages/admin/UserManagement.tsx';
let c = fs.readFileSync(file, 'utf8');

const startStr = "<Card>\\r\\n        <CardContent className=\\"p-0\\">";
const endStr = "</Card>\\r\\n\\r\\n      <UserFormDialog";

let s = c.indexOf(startStr);
let e = c.indexOf(endStr);

if (s === -1 || e === -1) {
    const altStart = "<Card>\\n        <CardContent className=\\"p-0\\">";
    const altEnd = "</Card>\\n\\n      <UserFormDialog";
    s = c.indexOf(altStart);
    e = c.indexOf(altEnd);
}

if (s !== -1 && e !== -1) {
    const tablePropsExec = `<UserManagementTable
        users={users}
        loading={loading}
        allSelected={allSelected}
        someSelected={someSelected}
        handleSelectAll={handleSelectAll}
        selectedUsers={selectedUsers}
        handleSelectUser={handleSelectUser}
        getUserInitials={getUserInitials}
        handleEditUser={handleEditUser}
        handleToggleUserStatus={handleToggleUserStatus}
        handleDeleteUser={handleDeleteUser}
        getUserTypeBadgeVariant={getUserTypeBadgeVariant}
        handleSyncUserEmail={handleSyncUserEmail}
        syncingUserId={syncingUserId}
        handleResetPasswordClick={handleResetPasswordClick}
        resetPasswordUserId={resetPasswordUserId}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        goToNextPage={goToNextPage}
        goToPreviousPage={goToPreviousPage}
        goToPage={goToPage}
      />`;

    c = c.substring(0, s) + tablePropsExec + "\\n\\n      <UserFormDialog" + c.substring(e + endStr.length);
    fs.writeFileSync(file, c);
    console.log("Replaced!");
} else {
    console.log("Not found.");
}
