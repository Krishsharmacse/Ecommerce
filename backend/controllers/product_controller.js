import { Product } from "../models/product_model.js";

export const createProduct = async (req, res) => {
    try {
        const { name, productName, description, price, category, stock, image } = req.body;
        const productData = {
            name: name || productName,
            productName: productName || name,
            description,
            price,
            category,
            stock,
            createdBy: req.user._id
        };
        
        // Handle image if provided
        if (image) {
            productData.image = image;
            productData.imageType = image.startsWith('data:') ? 'base64' : 'url';
        }
        
        const product = await Product.create(productData);
        res.status(201).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().populate("createdBy", "firstname email");
        
        // Ensure consistent field naming
        const formattedProducts = products.map(product => ({
            _id: product._id,
            name: product.name,
            productName: product.productName || product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            stock: product.stock,
            image: product.image,
            imageType: product.imageType,
            createdBy: product.createdBy,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        }));
        
        res.status(200).json({ success: true, products: formattedProducts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Not found" });

        // Only creator or admin can edit
        if (product.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        // Prepare update data
        const updateData = { ...req.body };
        
        // Ensure product name is consistent
        if (updateData.name) {
            updateData.productName = updateData.name;
        } else if (updateData.productName) {
            updateData.name = updateData.productName;
        }
        
        // Handle image update
        if (updateData.image) {
            updateData.imageType = updateData.image.startsWith('data:') ? 'base64' : 'url';
        }
        
        const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.status(200).json({ success: true, product: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate("createdBy", "firstname email");
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        
        // Format response for consistency
        const formattedProduct = {
            _id: product._id,
            name: product.name,
            productName: product.productName || product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            stock: product.stock,
            image: product.image,
            imageType: product.imageType,
            createdBy: product.createdBy,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        };
        
        res.status(200).json({ success: true, product: formattedProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Not found" });

        if (product.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        await product.deleteOne();
        res.status(200).json({ success: true, message: "Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};