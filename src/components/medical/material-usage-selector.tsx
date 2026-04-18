import { useState, useEffect } from 'react'
import { Trash2, Plus, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'

export interface MaterialUsage {
  materialId: string
  batchId: string
  quantity: number
  materialName: string
  batchNumber: string
}

interface Props {
  value?: MaterialUsage[]
  onChange: (value: MaterialUsage[]) => void
}

export function MaterialUsageSelector({ value = [], onChange }: Props) {
  const [materials, setMaterials] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])

  const [openMaterial, setOpenMaterial] = useState(false)
  const [selectedMat, setSelectedMat] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [quantity, setQuantity] = useState('')

  useEffect(() => {
    pb.collection('clinical_inventory').getFullList({ sort: 'name' }).then(setMaterials)
    pb.collection('inventory_batches')
      .getFullList({ filter: 'current_quantity > 0', sort: 'expiry_date' })
      .then(setBatches)
  }, [])

  const availableBatches = batches.filter((b) => b.material_id === selectedMat)

  const handleAdd = () => {
    if (!selectedMat || !selectedBatch || !quantity) return

    const batch = batches.find((b) => b.id === selectedBatch)
    const mat = materials.find((m) => m.id === selectedMat)
    const qty = parseFloat(quantity)

    if (!batch || !mat || isNaN(qty) || qty <= 0) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(batch.expiry_date)
    if (expiry < today) {
      toast.error('Este lote está vencido.')
      return
    }

    if (qty > batch.current_quantity) {
      toast.error(`Quantidade excede o estoque. Disponível: ${batch.current_quantity}`)
      return
    }

    const newUsage: MaterialUsage = {
      materialId: mat.id,
      batchId: batch.id,
      quantity: qty,
      materialName: mat.name,
      batchNumber: batch.batch_number,
    }

    onChange([...value, newUsage])
    setSelectedMat('')
    setSelectedBatch('')
    setQuantity('')
  }

  const removeUsage = (index: number) => {
    const newArr = [...value]
    newArr.splice(index, 1)
    onChange(newArr)
  }

  const selectedMatObj = materials.find((m) => m.id === selectedMat)

  return (
    <div className="space-y-4 rounded-md border p-4 bg-muted/20">
      <h4 className="font-medium text-sm">Materiais Utilizados</h4>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Material</Label>
          <Popover open={openMaterial} onOpenChange={setOpenMaterial}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openMaterial}
                className="w-full h-8 justify-between px-2 text-left font-normal"
              >
                <span className="truncate">
                  {selectedMatObj ? selectedMatObj.name : 'Buscar material...'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar material..." />
                <CommandList>
                  <CommandEmpty>Nenhum material encontrado.</CommandEmpty>
                  <CommandGroup>
                    {materials.map((m) => (
                      <CommandItem
                        key={m.id}
                        value={m.name}
                        onSelect={() => {
                          setSelectedMat(m.id)
                          setSelectedBatch('')
                          setOpenMaterial(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedMat === m.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {m.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Lote</Label>
          <Select value={selectedBatch} onValueChange={setSelectedBatch} disabled={!selectedMat}>
            <SelectTrigger className="h-8 px-2">
              <SelectValue placeholder="Lote" />
            </SelectTrigger>
            <SelectContent>
              {availableBatches.map((b) => {
                const isExpired =
                  new Date(b.expiry_date) < new Date(new Date().setHours(0, 0, 0, 0))
                return (
                  <SelectItem key={b.id} value={b.id} disabled={isExpired}>
                    {b.batch_number} (Validade:{' '}
                    {new Date(b.expiry_date).toLocaleDateString('pt-BR')} - Disp:{' '}
                    {b.current_quantity}){isExpired && ' [VENCIDO]'}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Qtd</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              className="h-8 px-2"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="icon"
            className="h-8 w-8 mb-[2px] shrink-0"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {value.length > 0 && (
        <div className="space-y-2 mt-4">
          {value.map((v, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm bg-background border px-3 py-2 rounded-md"
            >
              <div className="truncate pr-2">
                <span className="font-medium">{v.materialName}</span>
                <span className="text-muted-foreground ml-2 text-xs">Lote: {v.batchNumber}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-medium bg-muted px-2 py-1 rounded">
                  Qtd: {v.quantity}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeUsage(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
