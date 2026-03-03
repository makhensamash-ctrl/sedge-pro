import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Upload, X, Package, Edit, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  dimensions: string | null;
  price: number;
  photos: string[] | null;
  category: string | null;
  sku: string | null;
  is_active: boolean;
}

interface ProductsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectionMode?: boolean;
  onProductsSelected?: (products: Product[]) => void;
  openInAddMode?: boolean;
  onProductAdded?: (product: Product) => void;
  prefillData?: { name: string; price: number } | null;
}

export function ProductsDialog({ 
  isOpen, 
  onClose, 
  selectionMode = false, 
  onProductsSelected,
  openInAddMode = false,
  onProductAdded,
  prefillData = null
}: ProductsDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddMode, setIsAddMode] = useState(openInAddMode);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", dimensions: "", price: "", category: "", sku: "", quantity: "1"
  });
  const [saveForFuture, setSaveForFuture] = useState(true);

  useEffect(() => {
    if (openInAddMode && isOpen) setIsAddMode(true);
    if (prefillData && isOpen) {
      setNewProduct(prev => ({ ...prev, name: prefillData.name, price: prefillData.price.toString() }));
    }
  }, [openInAddMode, isOpen, prefillData]);

  useEffect(() => {
    if (editingProduct) {
      setNewProduct({
        name: editingProduct.name, description: editingProduct.description || "", dimensions: editingProduct.dimensions || "",
        price: editingProduct.price.toString(), category: editingProduct.category || "", sku: editingProduct.sku || "", quantity: "1"
      });
      setUploadedPhotos(editingProduct.photos || []);
      setSaveForFuture(true);
    }
  }, [editingProduct]);

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown) as Product[];
    },
    enabled: isOpen
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const uploadPromises = Array.from(files).map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error } = await supabase.storage.from('product-photos').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-photos').getPublicUrl(fileName);
      return publicUrl;
    });
    try {
      const photoUrls = await Promise.all(uploadPromises);
      setUploadedPhotos(prev => [...prev, ...photoUrls]);
      toast.success(`${photoUrls.length} photo(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload photos');
    }
  };

  const removePhoto = (photoUrl: string) => setUploadedPhotos(prev => prev.filter(url => url !== photoUrl));

  const addProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.price.trim()) {
      toast.error('Name and price are required');
      return;
    }
    try {
      if (editingProduct) {
        const { error } = await supabase.from('products').update({
          name: newProduct.name, description: newProduct.description || null, dimensions: newProduct.dimensions || null,
          price: parseFloat(newProduct.price), photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
          category: newProduct.category || null, sku: newProduct.sku || null,
        }).eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Product updated');
        refetch();
        resetForm();
      } else if (saveForFuture) {
        const { data, error } = await supabase.from('products').insert({
          name: newProduct.name, description: newProduct.description || null, dimensions: newProduct.dimensions || null,
          price: parseFloat(newProduct.price), photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
          category: newProduct.category || null, sku: newProduct.sku || null,
        }).select().single();
        if (error) throw error;
        toast.success('Product added');
        if (onProductAdded && data) {
          onProductAdded({ ...data, quantity: parseInt(newProduct.quantity) || 1 } as unknown as Product);
        }
        refetch();
      } else {
        const oneTimeProduct = {
          id: `temp-${Date.now()}`, name: newProduct.name, description: newProduct.description || null,
          dimensions: newProduct.dimensions || null, price: parseFloat(newProduct.price),
          photos: uploadedPhotos.length > 0 ? uploadedPhotos : null, category: newProduct.category || null,
          sku: newProduct.sku || null, is_active: true, quantity: parseInt(newProduct.quantity) || 1
        };
        if (onProductAdded) onProductAdded(oneTimeProduct);
        toast.success('Item added');
      }
      resetForm();
      if (openInAddMode) handleClose();
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const resetForm = () => {
    setNewProduct({ name: "", description: "", dimensions: "", price: "", category: "", sku: "", quantity: "1" });
    setUploadedPhotos([]);
    setSaveForFuture(true);
    if (!openInAddMode) setIsAddMode(false);
    setEditingProduct(null);
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from('products').update({ is_active: false }).eq('id', productId);
      if (error) throw error;
      toast.success('Product deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const toggleProductSelection = (product: Product) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === product.id);
      return isSelected ? prev.filter(p => p.id !== product.id) : [...prev, product];
    });
  };

  const handleAddSelectedProducts = () => {
    if (onProductsSelected && selectedProducts.length > 0) {
      onProductsSelected(selectedProducts);
      setSelectedProducts([]);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedProducts([]);
    setIsAddMode(openInAddMode);
    setEditingProduct(null);
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[90vh]' : 'max-w-4xl max-h-[80vh]'} overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Products & Services
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!isAddMode && !editingProduct && (
            <>
              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between'} items-center`}>
                <h3 className="text-lg font-semibold">{selectionMode ? 'Select Products to Add' : 'Your Products'}</h3>
                <div className={`flex ${isMobile ? 'flex-col w-full' : ''} gap-2`}>
                  {selectionMode && selectedProducts.length > 0 && (
                    <Button onClick={handleAddSelectedProducts}><Plus className="w-4 h-4 mr-2" />Add Selected ({selectedProducts.length})</Button>
                  )}
                  {!selectionMode && (
                    <Button onClick={() => setIsAddMode(true)}><Plus className="w-4 h-4 mr-2" />Add Product</Button>
                  )}
                </div>
              </div>

              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4 max-h-96 overflow-y-auto`}>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading products...</div>
                ) : products.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">No products added yet.</div>
                ) : (
                  products.map((product) => {
                    const isSelected = selectedProducts.some(p => p.id === product.id);
                    return (
                      <Card key={product.id} className={`${selectionMode && isSelected ? 'ring-2 ring-primary' : ''}`}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              {selectionMode && (
                                <Checkbox checked={isSelected} onCheckedChange={() => toggleProductSelection(product)} className="mt-1" />
                              )}
                              <div>
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                {product.sku && <Badge variant="outline" className="mt-1">SKU: {product.sku}</Badge>}
                              </div>
                            </div>
                            {!selectionMode && (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingProduct(product)}><Edit className="w-4 h-4" /></Button>
                                <Button variant="outline" size="sm" onClick={() => deleteProduct(product.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {product.photos && product.photos.length > 0 && (
                            <div className="flex gap-2 mb-3 overflow-x-auto">
                              {product.photos.map((photo, index) => (
                                <img key={index} src={photo} alt={`${product.name} ${index + 1}`} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
                              ))}
                            </div>
                          )}
                          {product.description && <p className="text-sm text-muted-foreground mb-2">{product.description}</p>}
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-primary">R{product.price.toLocaleString()}</span>
                            {product.category && <Badge variant="secondary">{product.category}</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}

          {(isAddMode || editingProduct) && (
            <div className="space-y-4">
              <div className={`flex ${isMobile ? 'flex-col' : 'justify-between'} items-center`}>
                <h3 className="text-lg font-semibold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <Button variant="outline" onClick={resetForm} className={isMobile ? 'w-full mt-2' : ''}><X className="w-4 h-4 mr-2" />Cancel</Button>
              </div>

              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                <div>
                  <Label htmlFor="name">Product/Service Name *</Label>
                  <Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} placeholder="Enter product/service name" />
                </div>
                <div>
                  <Label htmlFor="price">Price (R) *</Label>
                  <Input id="price" type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} placeholder="0.00" />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input id="quantity" type="number" min="1" value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} placeholder="1" />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} placeholder="e.g., Electronics, Service" />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} placeholder="Product SKU" />
                </div>
                <div>
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input id="dimensions" value={newProduct.dimensions} onChange={(e) => setNewProduct({...newProduct, dimensions: e.target.value})} placeholder="e.g., 10cm x 5cm" />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} placeholder="Product/service description" className="min-h-20" />
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                <Checkbox id="save-for-future" checked={saveForFuture} onCheckedChange={(checked) => setSaveForFuture(checked === true)} />
                <Label htmlFor="save-for-future" className="text-sm">
                  Save this item for future use
                  <p className="text-xs text-muted-foreground mt-1">
                    {saveForFuture ? "Item will be saved to your products library" : "Item will only be added as a one-time entry"}
                  </p>
                </Label>
              </div>

              {saveForFuture && (
                <div>
                  <Label>Product Photos (Optional)</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />Upload Photos
                      </Button>
                      <span className="text-sm text-muted-foreground">JPG, PNG, WebP (Max 5MB each)</span>
                    </div>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    {uploadedPhotos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {uploadedPhotos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img src={photo} alt={`Upload ${index + 1}`} className="w-full h-20 object-cover rounded-md" />
                            <Button variant="outline" size="sm" className="absolute -top-2 -right-2 w-6 h-6 p-0" onClick={() => removePhoto(photo)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={`flex ${isMobile ? 'flex-col' : 'justify-end'} gap-2`}>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={addProduct}>
                  {saveForFuture ? (editingProduct ? 'Update Product' : 'Add & Save Product') : 'Add Item'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}