import { Product } from "../models/product_model.js";
import { Shop } from "../models/shop_model.js";

// ════════════════════════════════════════════════════════════
// MANAGER: Create product in their shop
// ════════════════════════════════════════════════════════════
export const createProduct = async (req, res) => {
    try {
        const { name, productName, description, price, category, stock, image, tags } = req.body;

        // Manager or shopkeeper must have an approved shop
        if (req.user.role === "manager" || req.user.role === "shopkeeper") {
            if (!req.user.shopId) {
                return res.status(403).json({ success: false, message: "You must be assigned to a shop before adding products." });
            }
            const shop = await Shop.findById(req.user.shopId);
            if (!shop || shop.status !== "approved") {
                return res.status(403).json({ success: false, message: "Your shop is not yet approved. Wait for approval." });
            }
        }

        const finalName = name || productName;
        if (!finalName || !description || price === undefined || !category) {
            return res.status(400).json({ success: false, message: "Name, description, price, and category are required." });
        }

        if (Number(price) < 0) {
            return res.status(400).json({ success: false, message: "Price cannot be negative." });
        }

        // Owners can specify any shopId; managers/shopkeepers use their own shop
        const shopId = req.user.role === "owner" ? (req.body.shopId || req.user.shopId) : req.user.shopId;

        if (!shopId) {
            return res.status(400).json({ success: false, message: "A shop is required to add products." });
        }

        const productData = {
            name: finalName.trim(),
            productName: finalName.trim(),
            description: description.trim(),
            price: Number(price),
            category: category.trim(),
            stock: Number(stock) || 0,
            createdBy: req.user._id,
            shopId,
            tags: tags || [],
        };

        if (image) {
            productData.image = image;
            productData.imageType = image.startsWith("data:") ? "base64" : "url";
        }

        const product = await Product.create(productData);

        // Increment shop product count
        await Shop.findByIdAndUpdate(shopId, { $inc: { totalProducts: 1 } });

        res.status(201).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// PUBLIC: Get all products (optional shopId filter)
// ════════════════════════════════════════════════════════════
export const getAllProducts = async (req, res) => {
    try {
        const { shopId, category, search, page = 1, limit = 50 } = req.query;

        const filter = { isActive: true };
        if (shopId) filter.shopId = shopId;
        if (category) filter.category = { $regex: category, $options: "i" };
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [raw, total] = await Promise.all([
            Product.find(filter)
                .populate("createdBy", "firstname email")
                .populate("shopId", "name status logo")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Product.countDocuments(filter),
        ]);

        const products = raw.map(p => ({
            _id: p._id,
            name: p.name,
            productName: p.productName || p.name,
            description: p.description,
            price: p.price,
            category: p.category,
            stock: p.stock,
            image: p.image,
            imageType: p.imageType,
            tags: p.tags,
            shopId: p.shopId,
            createdBy: p.createdBy,
            totalSold: p.totalSold,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));

        res.status(200).json({ success: true, products, pagination: { page: parseInt(page), total, pages: Math.ceil(total / parseInt(limit)) } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// PUBLIC: Get product by ID
// ════════════════════════════════════════════════════════════
export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate("createdBy", "firstname email")
            .populate("shopId", "name status logo category");

        if (!product || !product.isActive) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        res.status(200).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// MANAGER/OWNER: Update product
// ════════════════════════════════════════════════════════════
export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found." });

        // Authorization: Owner can edit anything; Manager can only edit their shop's products
        if (req.user.role !== "owner") {
            const userShopId = req.user.shopId?.toString();
            if (!userShopId || product.shopId?.toString() !== userShopId) {
                return res.status(403).json({ success: false, message: "You can only edit products in your shop." });
            }
        }

        const updateData = { ...req.body };
        if (updateData.name) updateData.productName = updateData.name;
        else if (updateData.productName) updateData.name = updateData.productName;
        if (updateData.image) {
            updateData.imageType = updateData.image.startsWith("data:") ? "base64" : "url";
        }

        const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.status(200).json({ success: true, product: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// MANAGER/OWNER: Delete product
// ════════════════════════════════════════════════════════════
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found." });

        if (req.user.role !== "owner") {
            const userShopId = req.user.shopId?.toString();
            if (!userShopId || product.shopId?.toString() !== userShopId) {
                return res.status(403).json({ success: false, message: "You can only delete products in your shop." });
            }
        }

        await product.deleteOne();
        await Shop.findByIdAndUpdate(product.shopId, { $inc: { totalProducts: -1 } });

        res.status(200).json({ success: true, message: "Product deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ════════════════════════════════════════════════════════════
// MANAGER: Get only their own shop's products
// ════════════════════════════════════════════════════════════
export const getMyProducts = async (req, res) => {
    try {
        if (!req.user.shopId) {
            return res.status(200).json({ success: true, products: [] });
        }

        const products = await Product.find({ shopId: req.user.shopId })
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};