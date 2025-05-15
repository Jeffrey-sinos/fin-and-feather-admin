
import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Product } from '@/types';

interface StockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  product: Product | null;
  updateType: 'add' | 'remove';
  isSubmitting: boolean;
}

const StockUpdateModal: React.FC<StockUpdateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  product,
  updateType,
  isSubmitting,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setQuantity(value || 0);
    
    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid positive number');
    } else if (updateType === 'remove' && product && value > product.stock) {
      setError(`Cannot remove more than the current stock (${product.stock})`);
    } else {
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!error && quantity > 0) {
      onConfirm(quantity);
    }
  };

  const resetForm = () => {
    setQuantity(1);
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {updateType === 'add' ? 'Add Stock' : 'Remove Stock'}
          </DialogTitle>
          <DialogDescription>
            {updateType === 'add' 
              ? 'Add new stock quantity to the inventory' 
              : 'Remove stock quantity from the inventory'}
            {product && ` for ${product.name}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {product && (
              <div className="flex items-center space-x-2">
                <span className="font-medium">Current Stock:</span>
                <span>{product.stock}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={updateType === 'remove' && product ? product.stock : undefined}
                value={quantity}
                onChange={handleQuantityChange}
                className="w-full"
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!!error || isSubmitting || quantity <= 0}
              className={updateType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isSubmitting ? 'Processing...' : updateType === 'add' ? 'Add Stock' : 'Remove Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockUpdateModal;
