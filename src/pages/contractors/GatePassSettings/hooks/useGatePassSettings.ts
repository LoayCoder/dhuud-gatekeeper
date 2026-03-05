import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAllGatePassApprovers,
  useCreateGatePassApprover,
  useUpdateGatePassApprover,
  useDeleteGatePassApprover,
  GatePassApprover,
} from "@/features/contractors/hooks/use-gate-pass-approvers";
import {
  useAllGatePassTypes,
  useCreateGatePassType,
  useUpdateGatePassType,
  useDeleteGatePassType,
  GatePassType,
} from "@/features/contractors/hooks/use-gate-pass-types";
import { EditingApprover, EditingPassType } from "../types";

export function useGatePassSettings() {

  const { t } = useTranslation();
  
  // Approvers state and hooks
  const { data: approvers = [], isLoading } = useAllGatePassApprovers();
  const createApprover = useCreateGatePassApprover();
  const updateApprover = useUpdateGatePassApprover();
  const deleteApprover = useDeleteGatePassApprover();

  const [editing, setEditing] = useState<EditingApprover | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [newApprover, setNewApprover] = useState<EditingApprover>({
    id: null,
    user_id: "",
    approver_scope: "both",
    is_active: true,
  });
  
  // Pass Types state and hooks
  const { data: passTypes = [], isLoading: isLoadingTypes } = useAllGatePassTypes();
  const createPassType = useCreateGatePassType();
  const updatePassType = useUpdateGatePassType();
  const deletePassType = useDeleteGatePassType();
  
  const [editingType, setEditingType] = useState<EditingPassType | null>(null);
  const [isAddingType, setIsAddingType] = useState(false);
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);
  
  const [newPassType, setNewPassType] = useState<EditingPassType>({
    id: null,
    code: "",
    name: "",
    name_ar: "",
    allowed_scope: "both",
    is_active: true,
  });

  const handleStartEdit = (approver: GatePassApprover) => {
    setEditing({
      id: approver.id,
      user_id: approver.user_id || "",
      approver_scope: approver.approver_scope || "both",
      is_active: approver.is_active,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing?.id || !editing.user_id) return;
    await updateApprover.mutateAsync({
      id: editing.id,
      user_id: editing.user_id,
      approver_scope: editing.approver_scope,
      is_active: editing.is_active,
    });
    setEditing(null);
  };

  const handleCancelEdit = () => {
    setEditing(null);
  };

  const handleAddNew = async () => {
    if (!newApprover.user_id) return;
    
    // Generate a code from timestamp for uniqueness
    const code = `approver_${Date.now()}`;
    
    await createApprover.mutateAsync({
      name: "Approver", // Will be displayed from user profile
      code: code,
      user_id: newApprover.user_id,
      approver_scope: newApprover.approver_scope,
      is_active: newApprover.is_active,
      sort_order: approvers.length + 1,
    });
    setNewApprover({
      id: null,
      user_id: "",
      approver_scope: "both",
      is_active: true,
    });
    setIsAdding(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteApprover.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleToggleActive = async (approver: GatePassApprover) => {
    await updateApprover.mutateAsync({
      id: approver.id,
      is_active: !approver.is_active,
    });
  };

  // Pass Type handlers
  const handleStartEditType = (passType: GatePassType) => {
    setEditingType({
      id: passType.id,
      code: passType.code,
      name: passType.name,
      name_ar: passType.name_ar || "",
      allowed_scope: passType.allowed_scope,
      is_active: passType.is_active,
    });
  };

  const handleSaveEditType = async () => {
    if (!editingType?.id || !editingType.name || !editingType.code) return;
    await updatePassType.mutateAsync({
      id: editingType.id,
      code: editingType.code,
      name: editingType.name,
      name_ar: editingType.name_ar || undefined,
      allowed_scope: editingType.allowed_scope,
      is_active: editingType.is_active,
    });
    setEditingType(null);
  };

  const handleCancelEditType = () => {
    setEditingType(null);
  };

  const handleAddNewType = async () => {
    if (!newPassType.name || !newPassType.code) return;
    
    await createPassType.mutateAsync({
      code: newPassType.code,
      name: newPassType.name,
      name_ar: newPassType.name_ar || undefined,
      allowed_scope: newPassType.allowed_scope,
      is_active: newPassType.is_active,
      sort_order: passTypes.length + 1,
    });
    setNewPassType({
      id: null,
      code: "",
      name: "",
      name_ar: "",
      allowed_scope: "both",
      is_active: true,
    });
    setIsAddingType(false);
  };

  const handleDeleteType = async () => {
    if (!deleteTypeId) return;
    await deletePassType.mutateAsync(deleteTypeId);
    setDeleteTypeId(null);
  };

  const handleToggleTypeActive = async (passType: GatePassType) => {
    await updatePassType.mutateAsync({
      id: passType.id,
      is_active: !passType.is_active,
    });
  };


  return {
    t,
    approvers, isLoading, editing, setEditing,
    isAdding, setIsAdding, deleteId, setDeleteId, newApprover, setNewApprover,
    handleStartEdit, handleSaveEdit, handleCancelEdit, handleAddNew, handleDelete, handleToggleActive,
    
    passTypes, isLoadingTypes, editingType, setEditingType,
    isAddingType, setIsAddingType, deleteTypeId, setDeleteTypeId, newPassType, setNewPassType,
    handleStartEditType, handleSaveEditType, handleCancelEditType, handleAddNewType, handleDeleteType, handleToggleTypeActive
  };
}
