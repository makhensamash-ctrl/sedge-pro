import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus } from "lucide-react";

interface Client {
  id: string;
  name: string;
  company?: string | null;
}

interface ClientSearchSelectProps {
  clients: Client[];
  selectedClientId: string;
  onClientSelect: (clientId: string) => void;
  onAddNewClient: () => void;
}

export function ClientSearchSelect({
  clients,
  selectedClientId,
  onClientSelect,
  onAddNewClient,
}: ClientSearchSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const displayText = selectedClient
    ? `${selectedClient.name}${selectedClient.company ? ` - ${selectedClient.company}` : ""}`
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10"
        >
          {displayText || <span className="text-muted-foreground">Search or select a client...</span>}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type to search clients..." />
          <CommandList>
            <CommandEmpty>
              <div className="py-3 space-y-2">
                <p className="text-sm text-muted-foreground text-center">No clients found</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mx-auto flex"
                  onClick={() => {
                    setOpen(false);
                    onAddNewClient();
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add New Client
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.name} ${client.company || ""}`}
                  onSelect={() => {
                    onClientSelect(client.id);
                    setOpen(false);
                  }}
                >
                  <span>{client.name}</span>
                  {client.company && (
                    <span className="ml-auto text-muted-foreground text-xs">{client.company}</span>
                  )}
                </CommandItem>
              ))}
              <CommandItem
                value="__add_new_client__"
                onSelect={() => {
                  setOpen(false);
                  onAddNewClient();
                }}
                className="text-primary font-medium border-t mt-1 pt-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add new client
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}