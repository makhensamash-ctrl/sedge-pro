import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, X, ChevronDown, Check } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
}

interface LineItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  discount?: number;
  discountType?: "%" | "R";
}

interface ProductLineItemsProps {
  products: Product[];
  selectedProducts: LineItem[];
  onSelectedProductsChange: (products: LineItem[]) => void;
  onAddNewProduct: () => void;
  onSaveCustomProduct?: (name: string, price: number) => void;
  onAddDescription?: (index: number, name: string, price: number) => void;
  isVatIncluded?: boolean;
}

export function ProductLineItems({
  products,
  selectedProducts,
  onSelectedProductsChange,
  onAddNewProduct,
  onSaveCustomProduct,
  onAddDescription,
  isVatIncluded = true,
}: ProductLineItemsProps) {
  const isMobile = useIsMobile();
  const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSaveIds, setPendingSaveIds] = useState<Set<string>>(new Set());

  const selectProductForRow = (product: Product, rowIndex: number | null) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      onSelectedProductsChange(
        selectedProducts.map(p =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      onSelectedProductsChange([
        ...selectedProducts,
        { ...product, quantity: 1, discount: 0, discountType: "%" as const },
      ]);
    }
    setOpenRowIndex(null);
  };

  const addCustomItem = (name: string) => {
    const id = `custom-${Date.now()}`;
    const customItem: LineItem = {
      id,
      name,
      description: null,
      price: 0,
      quantity: 1,
      discount: 0,
      discountType: "%" as const,
    };
    onSelectedProductsChange([...selectedProducts, customItem]);
    setOpenRowIndex(null);
  };

  const addCustomItemInRow = (index: number) => {
    const newId = `custom-${Date.now()}`;
    onSelectedProductsChange(
      selectedProducts.map((p, i) =>
        i === index ? { ...p, id: newId, name: searchQuery.trim(), price: 0 } : p
      )
    );
    setSearchQuery("");
    setOpenRowIndex(null);
  };

  const dismissSave = (id: string) => {
    setPendingSaveIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const confirmSave = (item: LineItem) => {
    if (onSaveCustomProduct) {
      onSaveCustomProduct(item.name, item.price);
    }
    dismissSave(item.id);
  };

  const updateField = (index: number, field: string, value: any) => {
    const item = selectedProducts[index];
    if (field === "price" && isCustomItem(item) && !pendingSaveIds.has(item.id)) {
      setPendingSaveIds(prev => new Set(prev).add(item.id));
    }
    onSelectedProductsChange(
      selectedProducts.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const removeRow = (index: number) => {
    onSelectedProductsChange(selectedProducts.filter((_, i) => i !== index));
  };

  const getRowAmount = (item: LineItem) => {
    const lineTotal = item.price * item.quantity;
    const discount = item.discount || 0;
    if (item.discountType === "R") {
      return Math.max(0, lineTotal - discount);
    }
    return lineTotal * (1 - discount / 100);
  };

  const subtotal = selectedProducts.reduce((sum, p) => sum + getRowAmount(p), 0);
  const vat = isVatIncluded ? 0 : subtotal * 0.15;
  const total = subtotal + vat;

  const renderProductSearch = (onSelectCustom: () => void, onSelectProduct: (product: Product) => void, width = "w-[320px]") => (
    <PopoverContent className={`${width} p-0`} align="start">
      <Command>
        <CommandInput placeholder="Search or type new item..." value={searchQuery} onValueChange={setSearchQuery} />
        <CommandList>
          <CommandEmpty>
            <div className="py-3 space-y-2">
              {searchQuery.trim() && (
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={onSelectCustom}>
                  <Plus className="w-3 h-3" />
                  Add "{searchQuery.trim()}" as new item
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">or</p>
              <Button variant="outline" size="sm" className="mx-auto flex" onClick={() => { setOpenRowIndex(null); setSearchQuery(""); onAddNewProduct(); }}>
                <Plus className="w-3 h-3 mr-1" />
                Create & Save Product
              </Button>
            </div>
          </CommandEmpty>
          <CommandGroup>
            {searchQuery.trim() && (
              <CommandItem value={`__custom__${searchQuery}`} onSelect={onSelectCustom}>
                <Plus className="w-3 h-3 mr-1" />
                <span>Add "{searchQuery.trim()}" as new item</span>
              </CommandItem>
            )}
            {products.map((product) => (
              <CommandItem key={product.id} value={product.name} onSelect={() => onSelectProduct(product)}>
                <span>{product.name}</span>
                <span className="ml-auto text-muted-foreground">R{product.price.toFixed(2)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  );

  const isCustomItem = (item: LineItem) => item.id.startsWith("custom-");
  const isPendingSave = (item: LineItem) => pendingSaveIds.has(item.id);

  return (
    <div className="space-y-0">
      <div className="bg-muted/60 border border-border rounded-t-lg px-4 py-3">
        <h4 className="font-semibold text-sm">Item Table</h4>
      </div>

      <div className="border-x border-border">
        {!isMobile ? (
          <div className="grid grid-cols-[1fr_100px_110px_110px_110px_32px] gap-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <div className="px-4 py-2.5">Item Details</div>
            <div className="px-3 py-2.5 text-center">Quantity</div>
            <div className="px-3 py-2.5 text-center">Rate</div>
            <div className="px-3 py-2.5 text-center">Discount</div>
            <div className="px-3 py-2.5 text-right">Amount</div>
            <div className="px-1 py-2.5"></div>
          </div>
        ) : (
          <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            Item Details
          </div>
        )}

        {selectedProducts.map((item, index) => (
          <div key={`${item.id}-${index}`} className="border-b border-border last:border-b-0">
            {!isMobile ? (
              <>
                <div className="grid grid-cols-[1fr_100px_110px_110px_110px_32px] gap-0 items-center">
                  <div className="px-3 py-2">
                    <Popover open={openRowIndex === index} onOpenChange={(open) => setOpenRowIndex(open ? index : null)}>
                      <PopoverTrigger asChild>
                        <button className="w-full text-left text-sm py-1 hover:text-primary transition-colors truncate">
                          {item.name || <span className="text-muted-foreground italic">Type or click to select an item.</span>}
                        </button>
                      </PopoverTrigger>
                      {renderProductSearch(
                        () => addCustomItemInRow(index),
                        (product) => {
                          onSelectedProductsChange(
                            selectedProducts.map((p, i) =>
                              i === index ? { ...product, quantity: item.quantity, discount: item.discount || 0, discountType: item.discountType || "%" } : p
                            )
                          );
                          setSearchQuery("");
                          setOpenRowIndex(null);
                        }
                      )}
                    </Popover>
                  </div>
                  <div className="px-2 py-2">
                    <Input type="number" min="1" step="0.01" value={item.quantity} onChange={(e) => { const val = parseFloat(e.target.value); if (val > 0) updateField(index, "quantity", val); }} className="h-8 text-center text-sm border-0 bg-transparent focus-visible:ring-1" />
                  </div>
                  <div className="px-2 py-2">
                    <Input type="number" step="0.01" value={item.price} onChange={(e) => updateField(index, "price", parseFloat(e.target.value) || 0)} className="h-8 text-center text-sm border-0 bg-transparent focus-visible:ring-1" />
                  </div>
                  <div className="px-2 py-2 flex items-center gap-1">
                    <Input type="number" min="0" step="0.01" value={item.discount || 0} onChange={(e) => updateField(index, "discount", parseFloat(e.target.value) || 0)} className="h-8 text-center text-sm border-0 bg-transparent focus-visible:ring-1 w-14" />
                    <Select value={item.discountType || "%"} onValueChange={(val) => updateField(index, "discountType", val)}>
                      <SelectTrigger className="h-8 w-14 text-xs border-0 bg-transparent px-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="%">%</SelectItem>
                        <SelectItem value="R">R</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="px-3 py-2 text-right text-sm font-medium">{getRowAmount(item).toFixed(2)}</div>
                  <div className="px-1 py-2 flex justify-center">
                    <button onClick={() => removeRow(index)} className="text-destructive hover:text-destructive/80 transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                {isCustomItem(item) && (
                  <div className="flex items-center gap-3 px-4 py-1.5 bg-muted/30 border-t border-border">
                    {onAddDescription && (
                      <button onClick={() => onAddDescription(index, item.name, item.price)} className="text-xs text-primary hover:text-primary/80 underline transition-colors">Add description</button>
                    )}
                    {isPendingSave(item) && (
                      <>
                        <span className="text-xs text-muted-foreground">Save to products for future use?</span>
                        <button onClick={() => confirmSave(item)} className="text-green-600 hover:text-green-700 transition-colors" title="Save to products"><Check className="w-4 h-4" /></button>
                        <button onClick={() => dismissSave(item.id)} className="text-destructive hover:text-destructive/80 transition-colors" title="Don't save"><X className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <Popover open={openRowIndex === index} onOpenChange={(open) => setOpenRowIndex(open ? index : null)}>
                    <PopoverTrigger asChild>
                      <button className="text-left text-sm font-medium hover:text-primary transition-colors flex-1">
                        {item.name || <span className="text-muted-foreground italic">Type or click to select an item.</span>}
                      </button>
                    </PopoverTrigger>
                    {renderProductSearch(
                      () => addCustomItemInRow(index),
                      (product) => {
                        onSelectedProductsChange(selectedProducts.map((p, i) => i === index ? { ...product, quantity: item.quantity, discount: item.discount || 0, discountType: item.discountType || "%" } : p));
                        setSearchQuery("");
                        setOpenRowIndex(null);
                      },
                      "w-[280px]"
                    )}
                  </Popover>
                  <button onClick={() => removeRow(index)} className="text-destructive hover:text-destructive/80 ml-2"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Qty</Label>
                    <Input type="number" min="1" step="0.01" value={item.quantity} onChange={(e) => { const val = parseFloat(e.target.value); if (val > 0) updateField(index, "quantity", val); }} className="h-8 text-center text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Rate</Label>
                    <Input type="number" step="0.01" value={item.price} onChange={(e) => updateField(index, "price", parseFloat(e.target.value) || 0)} className="h-8 text-center text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Disc.</Label>
                    <div className="flex items-center gap-0.5">
                      <Input type="number" min="0" value={item.discount || 0} onChange={(e) => updateField(index, "discount", parseFloat(e.target.value) || 0)} className="h-8 text-center text-sm w-12" />
                      <span className="text-xs text-muted-foreground">{item.discountType || "%"}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Amount</Label>
                    <div className="h-8 flex items-center justify-end font-medium text-sm">{getRowAmount(item).toFixed(2)}</div>
                  </div>
                </div>
                {isCustomItem(item) && (
                  <div className="flex items-center gap-2 pt-1">
                    {onAddDescription && (
                      <button onClick={() => onAddDescription(index, item.name, item.price)} className="text-xs text-primary hover:text-primary/80 underline transition-colors">Add description</button>
                    )}
                    {isPendingSave(item) && (
                      <>
                        <span className="text-xs text-muted-foreground">Save for future?</span>
                        <button onClick={() => confirmSave(item)} className="text-green-600 hover:text-green-700 transition-colors"><Check className="w-4 h-4" /></button>
                        <button onClick={() => dismissSave(item.id)} className="text-destructive hover:text-destructive/80 transition-colors"><X className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Empty row placeholder */}
        <div className="border-b border-border last:border-b-0">
          {!isMobile ? (
            <div className="grid grid-cols-[1fr_100px_110px_110px_110px_32px] gap-0 items-center">
              <div className="px-3 py-2">
                <Popover open={openRowIndex === selectedProducts.length} onOpenChange={(open) => setOpenRowIndex(open ? selectedProducts.length : null)}>
                  <PopoverTrigger asChild>
                    <button className="w-full text-left text-sm py-1 text-muted-foreground italic hover:text-foreground transition-colors">Type or click to select an item.</button>
                  </PopoverTrigger>
                  {renderProductSearch(
                    () => { addCustomItem(searchQuery.trim()); setSearchQuery(""); },
                    (product) => { selectProductForRow(product, selectedProducts.length); setSearchQuery(""); }
                  )}
                </Popover>
              </div>
              <div className="px-2 py-2 text-center text-sm text-muted-foreground">1.00</div>
              <div className="px-2 py-2 text-center text-sm text-muted-foreground">0.00</div>
              <div className="px-2 py-2 text-center text-sm text-muted-foreground">0 %</div>
              <div className="px-3 py-2 text-right text-sm text-muted-foreground">0.00</div>
              <div className="px-1 py-2"></div>
            </div>
          ) : (
            <div className="p-3">
              <Popover open={openRowIndex === selectedProducts.length} onOpenChange={(open) => setOpenRowIndex(open ? selectedProducts.length : null)}>
                <PopoverTrigger asChild>
                  <button className="w-full text-left text-sm py-1 text-muted-foreground italic hover:text-foreground transition-colors">Type or click to select an item.</button>
                </PopoverTrigger>
                {renderProductSearch(
                  () => { addCustomItem(searchQuery.trim()); setSearchQuery(""); },
                  (product) => { selectProductForRow(product, selectedProducts.length); setSearchQuery(""); },
                  "w-[280px]"
                )}
              </Popover>
            </div>
          )}
        </div>
      </div>

      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 border-x border-b border-border rounded-b-lg px-4 py-3`}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpenRowIndex(selectedProducts.length)} className="text-sm gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add New Row
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
          <Button variant="outline" size="sm" onClick={onAddNewProduct} className="text-sm gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Items in Bulk
          </Button>
        </div>
      </div>

      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 mt-4`}>
        <div className="w-full space-y-0">
          <div className="flex justify-between items-center py-2.5 px-4 bg-muted/40 border border-border rounded-t-lg">
            <span className="text-sm font-medium">Sub Total</span>
            <span className="text-sm font-semibold">{subtotal.toFixed(2)}</span>
          </div>
          {!isVatIncluded && (
            <div className="flex justify-between items-center py-2.5 px-4 border-x border-b border-border">
              <span className="text-sm">VAT (15%)</span>
              <span className="text-sm">{vat.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-3 px-4 bg-muted/60 border-x border-b border-border rounded-b-lg">
            <span className="text-sm font-bold">Total ( R )</span>
            <span className="text-base font-bold">{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}