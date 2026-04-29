// routes/savedLocations.ts
import express, { Request, Response, Router } from "express";
import { supabaseAdmin } from "../config/supabase";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

const router: Router = express.Router();

// Get all saved locations for a user
router.get(
  "/saved-locations",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      console.log(req.user)
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data, error } = await supabaseAdmin
        .from("saved_locations")
        .select("*")
        .eq("customer_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json(data || []);
    } catch (error: any) {
      console.error("Error fetching saved locations:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Save new location
router.post(
  "/saved-locations",
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, address, latitude, longitude, is_default } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // If this is the first location or is_default is true, ensure other locations are not default
      let shouldBeDefault = is_default || false;

      if (shouldBeDefault) {
        // Remove default from all other locations
        const { error: updateError } = await supabaseAdmin
          .from("saved_locations")
          .update({ is_default: false })
          .eq("customer_id", userId);

        if (updateError) throw updateError;
      } else {
        // Check if this is the first location
        const { count, error: countError } = await supabaseAdmin
          .from("saved_locations")
          .select("*", { count: "exact", head: true })
          .eq("customer_id", userId);

        if (countError) throw countError;

        if (count === 0) {
          shouldBeDefault = true; // Make first location default
        }
      }

      const { data, error } = await supabaseAdmin
        .from("saved_locations")
        .insert({
          customer_id: userId,
          name,
          address,
          latitude,
          longitude,
          is_default: shouldBeDefault,
        })
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error: any) {
      console.error("Error saving location:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete saved location
router.delete(
  "/saved-locations/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // First check if the location exists and belongs to the user
      const { data: location, error: fetchError } = await supabaseAdmin
        .from("saved_locations")
        .select("is_default")
        .eq("id", id)
        .eq("customer_id", userId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the location
      const { error: deleteError } = await supabaseAdmin
        .from("saved_locations")
        .delete()
        .eq("id", id)
        .eq("customer_id", userId);

      if (deleteError) throw deleteError;

      // If the deleted location was default, set another location as default
      if (location?.is_default) {
        const { data: remainingLocations, error: remainingError } =
          await supabaseAdmin
            .from("saved_locations")
            .select("id")
            .eq("customer_id", userId)
            .limit(1);

        if (
          !remainingError &&
          remainingLocations &&
          remainingLocations.length > 0
        ) {
          await supabaseAdmin
            .from("saved_locations")
            .update({ is_default: true })
            .eq("id", remainingLocations[0].id);
        }
      }

      res.json({ message: "Location deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting location:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Set default location
router.patch(
  "/saved-locations/:id/set-default",
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      // Start a transaction by making multiple requests
      // First, remove default from all user's locations
      const { error: updateError } = await supabaseAdmin
        .from("saved_locations")
        .update({ is_default: false })
        .eq("customer_id", userId);

      if (updateError) throw updateError;

      // Then set the selected location as default
      const { data, error } = await supabaseAdmin
        .from("saved_locations")
        .update({ is_default: true })
        .eq("id", id)
        .eq("customer_id", userId)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error: any) {
      console.error("Error setting default location:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Get default location for user
router.get(
  "/saved-locations/default",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data, error } = await supabaseAdmin
        .from("saved_locations")
        .select("*")
        .eq("customer_id", userId)
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;

      res.json(data || null);
    } catch (error: any) {
      console.error("Error fetching default location:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// Update location
router.put(
  "/saved-locations/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, address, latitude, longitude } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("saved_locations")
        .update({
          name,
          address,
          latitude,
          longitude,
          updated_at: new Date(),
        })
        .eq("id", id)
        .eq("customer_id", userId)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error: any) {
      console.error("Error updating location:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
