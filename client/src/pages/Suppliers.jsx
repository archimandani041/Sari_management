/**
 * Suppliers Page — Redesigned with shadcn/ui & Tailwind CSS
 * Partner & Weaver Network Directory with fast search, direct WhatsApp triggers, and full CRUD.
 */
import { useState, useEffect, useCallback } from 'react';
import { supplierAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';
import {
  Store,
  Plus,
  Search,
  MessageCircle,
  Pencil,
  Trash2,
  Building2,
  Phone,
  User,
  X,
  Users
} from 'lucide-react';

const EMPTY_FORM = { name: '', company_name: '', mobile: '', email: '', address: '', notes: '' };

const Suppliers = () => {
  const { isAdmin, isStaff } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supplierAPI.getAll();
      setSuppliers(data.suppliers || []);
    } catch (e) {
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      company_name: s.company_name || '',
      mobile: s.mobile,
      email: s.email || '',
      address: s.address || '',
      notes: s.notes || '',
    });
    setError('');
    setDialogOpen(true);
  };

  const openDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Supplier name is required');
      return;
    }
    if (!form.mobile.trim()) {
      setError('Mobile number is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await supplierAPI.update(editId, form);
        setSnack('Supplier profile updated');
      } else {
        await supplierAPI.create(form);
        setSnack('Supplier profile created');
      }
      setDialogOpen(false);
      fetchSuppliers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await supplierAPI.delete(deleteId);
      setDeleteOpen(false);
      setSnack('Supplier removed');
      fetchSuppliers();
    } catch (e) {
      setError('Failed to delete supplier');
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      s.mobile.includes(search)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast */}
      {snack && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-burgundy-900 text-white text-xs font-semibold shadow-luxury-lg animate-fade-in">
          <span>{snack}</span>
          <button onClick={() => setSnack('')} className="ml-2 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Suppliers & Weavers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your artisanal fabric network and link suppliers to combinations.
          </p>
        </div>

        {(isAdmin || isStaff) && (
          <Button
            variant="luxury"
            onClick={openCreate}
            className="text-xs font-bold h-9 shadow-luxury"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Supplier
          </Button>
        )}
      </div>

      {/* Search Input */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by supplier name, textile company, or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-xs h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border border-border shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase">Supplier / Weaver</TableHead>
                <TableHead className="text-xs font-bold uppercase">Firm / Company</TableHead>
                <TableHead className="text-xs font-bold uppercase">Contact & WhatsApp</TableHead>
                {(isAdmin || isStaff) && (
                  <TableHead className="text-xs font-bold uppercase text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && suppliers.length === 0 ? (
                [1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4} className="py-4">
                      <div className="h-6 w-full bg-muted/50 rounded-md animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 opacity-40" />
                      <span className="text-sm font-medium">
                        {search ? 'No suppliers match your search.' : 'No suppliers registered yet.'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 ring-1 ring-border">
                          <AvatarFallback className="bg-burgundy-900 text-white text-xs font-bold">
                            {s.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-xs text-foreground">
                          {s.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3.5">
                      {s.company_name ? (
                        <Badge variant="outline" className="text-[11px] font-medium gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          {s.company_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            let num = s.mobile.replace(/[\s\-()]/g, '');
                            if (!num.startsWith('+') && !num.startsWith('91') && num.replace(/\D/g, '').length === 10) {
                              num = '91' + num;
                            }
                            num = num.replace(/\D/g, '');
                            window.open(`https://wa.me/${num}`, '_blank');
                          }}
                          className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <span className="font-mono text-xs text-foreground font-medium">
                          {s.mobile}
                        </span>
                      </div>
                    </TableCell>

                    {(isAdmin || isStaff) && (
                      <TableCell className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(s)}
                            title="Edit Supplier"
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDelete(s.id)}
                            className="text-destructive hover:bg-destructive/10"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editId ? 'Edit Supplier Details' : 'Add New Supplier'}
            </DialogTitle>
            <DialogDescription>
              Register vendor contact information for direct WhatsApp communications and stock tracking.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="sName" className="text-xs font-semibold">
                Supplier / Weaver Name *
              </Label>
              <Input
                id="sName"
                placeholder="e.g. Ramesh Chandra"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sCompany" className="text-xs font-semibold">
                Company / Loom Name
              </Label>
              <Input
                id="sCompany"
                placeholder="e.g. Royal Silk Mills"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sMobile" className="text-xs font-semibold">
                Mobile Number *
              </Label>
              <Input
                id="sMobile"
                placeholder="+91 98765 43210"
                value={form.mobile}
                onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="luxury" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editId ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive font-serif">Remove Supplier?</DialogTitle>
            <DialogDescription>
              This will deactivate the supplier and remove their links from active combination stock records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remove Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;
