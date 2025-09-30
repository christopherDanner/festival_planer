export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '13.0.5';
	};
	public: {
		Tables: {
			checklist_items: {
				Row: {
					category: string;
					completed: boolean;
					created_at: string;
					due_date: string;
					festival_id: string;
					id: string;
					priority: string;
					task: string;
				};
				Insert: {
					category: string;
					completed?: boolean;
					created_at?: string;
					due_date: string;
					festival_id: string;
					id?: string;
					priority: string;
					task: string;
				};
				Update: {
					category?: string;
					completed?: boolean;
					created_at?: string;
					due_date?: string;
					festival_id?: string;
					id?: string;
					priority?: string;
					task?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'checklist_items_festival_id_fkey';
						columns: ['festival_id'];
						isOneToOne: false;
						referencedRelation: 'festivals';
						referencedColumns: ['id'];
					}
				];
			};
			festival_members: {
				Row: {
					created_at: string;
					email: string | null;
					festival_id: string;
					first_name: string;
					id: string;
					is_active: boolean;
					last_name: string;
					notes: string | null;
					phone: string | null;
					station_preferences: string[] | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					email?: string | null;
					festival_id: string;
					first_name: string;
					id?: string;
					is_active?: boolean;
					last_name: string;
					notes?: string | null;
					phone?: string | null;
					station_preferences?: string[] | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					email?: string | null;
					festival_id?: string;
					first_name?: string;
					id?: string;
					is_active?: boolean;
					last_name?: string;
					notes?: string | null;
					phone?: string | null;
					station_preferences?: string[] | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'fk_festival_members_festival_id';
						columns: ['festival_id'];
						isOneToOne: false;
						referencedRelation: 'festivals';
						referencedColumns: ['id'];
					}
				];
			};
			festivals: {
				Row: {
					created_at: string;
					end_date: string | null;
					id: string;
					location: string | null;
					name: string | null;
					start_date: string;
					type: string;
					updated_at: string;
					user_id: string;
					visitor_count: string;
				};
				Insert: {
					created_at?: string;
					end_date?: string | null;
					id?: string;
					location?: string | null;
					name?: string | null;
					start_date: string;
					type: string;
					updated_at?: string;
					user_id: string;
					visitor_count: string;
				};
				Update: {
					created_at?: string;
					end_date?: string | null;
					id?: string;
					location?: string | null;
					name?: string | null;
					start_date?: string;
					type?: string;
					updated_at?: string;
					user_id?: string;
					visitor_count?: string;
				};
				Relationships: [];
			};
			members: {
				Row: {
					created_at: string;
					email: string | null;
					first_name: string;
					id: string;
					is_active: boolean;
					last_name: string;
					notes: string | null;
					phone: string | null;
					station_preferences: string[] | null;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					email?: string | null;
					first_name: string;
					id?: string;
					is_active?: boolean;
					last_name: string;
					notes?: string | null;
					phone?: string | null;
					station_preferences?: string[] | null;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					email?: string | null;
					first_name?: string;
					id?: string;
					is_active?: boolean;
					last_name?: string;
					notes?: string | null;
					phone?: string | null;
					station_preferences?: string[] | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			resources: {
				Row: {
					created_at: string;
					einheit: string;
					festival_id: string;
					id: string;
					item: string;
					kosten: string;
					lieferant: string;
					menge: string;
					priority: string;
					status: string;
				};
				Insert: {
					created_at?: string;
					einheit: string;
					festival_id: string;
					id?: string;
					item: string;
					kosten: string;
					lieferant: string;
					menge: string;
					priority: string;
					status?: string;
				};
				Update: {
					created_at?: string;
					einheit?: string;
					festival_id?: string;
					id?: string;
					item?: string;
					kosten?: string;
					lieferant?: string;
					menge?: string;
					priority?: string;
					status?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'resources_festival_id_fkey';
						columns: ['festival_id'];
						isOneToOne: false;
						referencedRelation: 'festivals';
						referencedColumns: ['id'];
					}
				];
			};
			shift_assignments: {
				Row: {
					created_at: string;
					festival_id: string;
					festival_member_id: string | null;
					id: string;
					member_id: string | null;
					position: number | null;
					shift_id: string | null;
					station_id: string | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					festival_id: string;
					festival_member_id?: string | null;
					id?: string;
					member_id?: string | null;
					position?: number | null;
					shift_id?: string | null;
					station_id?: string | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					festival_id?: string;
					festival_member_id?: string | null;
					id?: string;
					member_id?: string | null;
					position?: number | null;
					shift_id?: string | null;
					station_id?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'fk_shift_assignments_festival';
						columns: ['festival_id'];
						isOneToOne: false;
						referencedRelation: 'festivals';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'fk_shift_assignments_member';
						columns: ['member_id'];
						isOneToOne: false;
						referencedRelation: 'members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'fk_shift_assignments_shift';
						columns: ['shift_id'];
						isOneToOne: false;
						referencedRelation: 'shifts';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'fk_shift_assignments_station';
						columns: ['station_id'];
						isOneToOne: false;
						referencedRelation: 'stations';
						referencedColumns: ['id'];
					}
				];
			};
			shifts: {
				Row: {
					created_at: string;
					end_date: string | null;
					end_time: string;
					festival_id: string;
					id: string;
					name: string;
					start_date: string;
					start_time: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					end_date?: string | null;
					end_time: string;
					festival_id: string;
					id?: string;
					name: string;
					start_date: string;
					start_time: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					end_date?: string | null;
					end_time?: string;
					festival_id?: string;
					id?: string;
					name?: string;
					start_date?: string;
					start_time?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'fk_shifts_festival';
						columns: ['festival_id'];
						isOneToOne: false;
						referencedRelation: 'festivals';
						referencedColumns: ['id'];
					}
				];
			};
			station_assignments: {
				Row: {
					bedarf: number;
					bereich: string;
					created_at: string;
					festival_id: string;
					id: string;
					personen: string[];
					priority: string;
					status: string;
					zeit: string;
				};
				Insert: {
					bedarf: number;
					bereich: string;
					created_at?: string;
					festival_id: string;
					id?: string;
					personen?: string[];
					priority: string;
					status?: string;
					zeit: string;
				};
				Update: {
					bedarf?: number;
					bereich?: string;
					created_at?: string;
					festival_id?: string;
					id?: string;
					personen?: string[];
					priority?: string;
					status?: string;
					zeit?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'station_assignments_festival_id_fkey';
						columns: ['festival_id'];
						isOneToOne: false;
						referencedRelation: 'festivals';
						referencedColumns: ['id'];
					}
				];
			};
			station_member_assignments: {
				Row: {
					created_at: string;
					festival_member_id: string;
					id: string;
					station_id: string;
				};
				Insert: {
					created_at?: string;
					festival_member_id: string;
					id?: string;
					station_id: string;
				};
				Update: {
					created_at?: string;
					festival_member_id?: string;
					id?: string;
					station_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'fk_station_member_assignments_festival_member_id';
						columns: ['festival_member_id'];
						isOneToOne: false;
						referencedRelation: 'festival_members';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'fk_station_member_assignments_station_id';
						columns: ['station_id'];
						isOneToOne: false;
						referencedRelation: 'station_assignments';
						referencedColumns: ['id'];
					}
				];
			};
			station_shift_assignments: {
				Row: {
					created_at: string;
					festival_id: string;
					id: string;
					shift_id: string;
					station_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					festival_id: string;
					id?: string;
					shift_id: string;
					station_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					festival_id?: string;
					id?: string;
					shift_id?: string;
					station_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'station_shift_assignments_festival_id_fkey';
						columns: ['festival_id'];
						isOneToOne: false;
						referencedRelation: 'festivals';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'station_shift_assignments_shift_id_fkey';
						columns: ['shift_id'];
						isOneToOne: false;
						referencedRelation: 'shifts';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'station_shift_assignments_station_id_fkey';
						columns: ['station_id'];
						isOneToOne: false;
						referencedRelation: 'stations';
						referencedColumns: ['id'];
					}
				];
			};
			stations: {
				Row: {
					created_at: string;
					description: string | null;
					festival_id: string;
					id: string;
					name: string;
					required_people: number;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					description?: string | null;
					festival_id: string;
					id?: string;
					name: string;
					required_people?: number;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					description?: string | null;
					festival_id?: string;
					id?: string;
					name?: string;
					required_people?: number;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'fk_stations_festival';
						columns: ['festival_id'];
						isOneToOne: false;
						referencedRelation: 'festivals';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
	  }
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
	? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
			Row: infer R;
	  }
		? R
		: never
	: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
	  }
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
	? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
			Insert: infer I;
	  }
		? I
		: never
	: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
	  }
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
	? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
			Update: infer U;
	  }
		? U
		: never
	: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
	? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
	: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
	? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
	: never;

export const Constants = {
	public: {
		Enums: {}
	}
} as const;
